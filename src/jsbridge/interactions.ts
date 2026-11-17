import { BridgeCode, BridgeError, type MediaAsset, type PreviewResult } from './protocol'

export interface CameraTask {
  /** 拍照质量，0 - 1。 */
  quality: number
}

export interface PreviewTask {
  uri: string
  name: string
  mimeType: string
  size: number
}

type Pending<TRequest, TResult> = {
  request: TRequest
  resolve: (value: TResult) => void
  reject: (error: Error) => void
}

/**
 * 把「Native 方法」和「需要用户操作的界面」连起来的最小队列。
 *
 * 处理器调用 `ask()` 挂起并返回 Promise，根布局里的 Host 组件订阅同一个队列，
 * 渲染相机 / 预览界面，用户操作完成后调用 `resolve()` 或 `reject()`。
 */
export class InteractionQueue<TRequest, TResult> {
  private pending: Pending<TRequest, TResult> | null = null
  private readonly listeners = new Set<(request: TRequest | null) => void>()

  /** 发起一次交互。同一时刻只保留一个，旧的会被取消。 */
  ask(request: TRequest): Promise<TResult> {
    this.pending?.reject(new BridgeError(BridgeCode.CANCELLED, '请求被新的调用取代'))

    return new Promise<TResult>((resolve, reject) => {
      this.pending = { request, resolve, reject }
      this.notify()
    })
  }

  subscribe(listener: (request: TRequest | null) => void): () => void {
    this.listeners.add(listener)
    listener(this.pending?.request ?? null)

    return () => {
      this.listeners.delete(listener)
    }
  }

  resolve(value: TResult) {
    const pending = this.pending
    if (!pending) {
      return
    }

    this.pending = null
    this.notify()
    pending.resolve(value)
  }

  reject(error: Error) {
    const pending = this.pending
    if (!pending) {
      return
    }

    this.pending = null
    this.notify()
    pending.reject(error)
  }

  private notify() {
    const request = this.pending?.request ?? null
    this.listeners.forEach((listener) => listener(request))
  }
}

/** 拍照 / 相册选择。 */
export const cameraQueue = new InteractionQueue<CameraTask, MediaAsset>()

/** 文件预览。 */
export const previewQueue = new InteractionQueue<PreviewTask, PreviewResult>()
