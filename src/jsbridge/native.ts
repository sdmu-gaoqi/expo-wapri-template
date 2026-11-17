import { handlers } from './handlers'
import { BridgeCode, BridgeError, type BridgeRequest, type BridgeResponse } from './protocol'
import { runtime } from './runtime'

/** 通信日志：`in` 表示 JS -> Native，`out` 表示 Native -> JS。 */
export interface BridgePacket {
  direction: 'in' | 'out'
  method: string
  body: string
  code?: number
  at: number
}

/**
 * 容器侧的协议实现。
 *
 * 负责把 WebView 发来的报文分发给 `handlers`，再把结果按统一信封回传，
 * 同时把每一帧通信广播给调试面板。
 */
export class NativeBridge {
  private sender: ((js: string) => void) | null = null
  private readonly listeners = new Set<(packet: BridgePacket) => void>()

  /** 绑定 WebView 的 injectJavaScript。返回解绑函数。 */
  attach(sender: (js: string) => void): () => void {
    this.sender = sender
    runtime.emit = (eventName, data) => this.emit(eventName, data)

    return () => {
      if (this.sender !== sender) {
        return
      }
      this.sender = null
      runtime.emit = null
    }
  }

  subscribe(listener: (packet: BridgePacket) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** 处理一帧来自 WebView 的消息。 */
  async receive(raw: string): Promise<void> {
    const request = parseIncoming(raw)
    if (!request) {
      return
    }

    this.notify({
      direction: 'in',
      method: request.method,
      body: JSON.stringify(request.params ?? {}, null, 0),
      at: Date.now(),
    })

    const handler = handlers[request.method]

    if (!handler) {
      this.respond(
        {
          requestId: request.requestId,
          code: BridgeCode.NOT_FOUND,
          message: `未实现的 Native 方法：${request.method}`,
        },
        request.method,
      )
      return
    }

    try {
      const data = await handler(request.params, {
        requestId: request.requestId,
        method: request.method,
      })

      this.respond(
        {
          requestId: request.requestId,
          code: BridgeCode.OK,
          message: 'success',
          ...(data === undefined ? {} : { data }),
        },
        request.method,
      )
    } catch (error: unknown) {
      const code = error instanceof BridgeError ? error.code : BridgeCode.INTERNAL_ERROR
      const message = error instanceof Error ? error.message : String(error)

      this.respond({ requestId: request.requestId, code, message }, request.method)
    }
  }

  /** 主动下发 Native 事件（与请求响应分离）。 */
  emit(eventName: string, data: unknown) {
    const json = JSON.stringify(data ?? null)
    this.send(
      `window.onNativeEvent && window.onNativeEvent(${JSON.stringify(eventName)}, ${JSON.stringify(json)}); true;`,
    )
    this.notify({
      direction: 'out',
      method: `event:${eventName}`,
      body: json,
      at: Date.now(),
    })
  }

  private respond(response: BridgeResponse, method: string) {
    const json = JSON.stringify(response)

    // 用 JSON.stringify 再包一层，避免报文里的引号破坏注入脚本。
    this.send(`window.onNativeMessage && window.onNativeMessage(${JSON.stringify(json)}); true;`)

    this.notify({
      direction: 'out',
      method,
      // 回包里可能带 base64 缩略图，日志只保留开头，避免卡住调试面板。
      body: truncate(json),
      code: response.code,
      at: Date.now(),
    })
  }

  private send(js: string) {
    if (!this.sender) {
      return
    }

    try {
      this.sender(js)
    } catch {
      // WebView 已卸载，忽略。
    }
  }

  private notify(packet: BridgePacket) {
    this.listeners.forEach((listener) => listener(packet))
  }
}

/**
 * 解析 WebView 消息。
 *
 * 支持两种形态：
 * 1. 注入脚本的包裹格式 `{ kind: 'request', channel, body: '{"method":...}' }`
 * 2. 业务直接 `postMessage(JSON.stringify({ method, params, requestId }))`
 */
function parseIncoming(raw: string): BridgeRequest | null {
  if (!raw) {
    return null
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return null
  }

  if (!payload || typeof payload !== 'object') {
    return null
  }

  const envelope = payload as Record<string, unknown>
  let body: unknown = envelope

  if (typeof envelope.body === 'string') {
    try {
      body = JSON.parse(envelope.body)
    } catch {
      return null
    }
  }

  if (!body || typeof body !== 'object') {
    return null
  }

  const request = body as Record<string, unknown>
  const method = typeof request.method === 'string' ? request.method : ''

  if (!method) {
    return null
  }

  const requestId =
    typeof request.requestId === 'string' && request.requestId ? request.requestId : `Native${Date.now()}`

  const params = request.params && typeof request.params === 'object' ? (request.params as Record<string, unknown>) : {}

  return { method, params, requestId }
}

/** 日志面板的展示上限，超出部分截断。 */
function truncate(text: string, max = 600): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}
