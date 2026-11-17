/**
 * JSBridge 协议定义。
 *
 * 报文格式与 `@wapri/gjsbridge` 保持一致：
 * - Android / 鸿蒙：`window.JSBridge.handle("{ method, params, requestId }")`
 * - iOS：`window.webkit.messageHandlers[method].postMessage("{ params, requestId }")`
 * - 回包：`window.onNativeMessage("{ requestId, code, message, data }")`
 * - 事件：`window.onNativeEvent(eventName, "{...}")`
 */

/** 容器实际实现的 Native 方法名。业务方法名通过 registry 映射到这里。 */
export type NativeMethod =
  | 'permission.caniuse'
  | 'getSafeArea'
  | 'closeWebview'
  | 'makePhoneCall'
  | 'takePhoto'
  | 'chooseFile'
  | 'getLocation'
  | 'previewFile'
  | 'uploadFile'
  | 'getAppInfo'

/** Native 收到的请求。iOS 报文不带 method，由注入脚本按 handler 名补齐。 */
export interface BridgeRequest<P = Record<string, unknown>> {
  method: string
  params: P
  requestId: string
}

/** Native 回包信封。code 为 0 表示成功，其余为失败。 */
export interface BridgeResponse<T = unknown> {
  requestId: string
  code: number
  message: string
  data?: T
}

/** 与 SDK 一致的错误码约定。 */
export const BridgeCode = {
  OK: 0,
  INVALID_PARAMS: 400,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
  UNSUPPORTED: 501,
  CANCELLED: 4001,
} as const

export type BridgeCodeValue = (typeof BridgeCode)[keyof typeof BridgeCode]

/** Native 业务失败时抛出，H5 侧会收到同 code 的 BridgeError。 */
export class BridgeError extends Error {
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'BridgeError'
    this.code = code
  }
}

/** 统一的媒体文件描述，拍照 / 选文件 / 选相册都收敛到这一结构。 */
export interface MediaAsset {
  uri: string
  name: string
  mimeType: string
  /** 字节数。部分来源取不到时为 0。 */
  size: number
  source: 'camera' | 'library' | 'picker'
  width?: number
  height?: number
  /** 小尺寸预览图（data URI）。WebView 直接引用本地文件会受限，所以由 Native 转成 base64。 */
  thumbnail?: string
}

export interface GeoInfo {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number | null
  heading: number | null
  speed: number | null
  /** ISO 8601 时间戳。 */
  timestamp: string
  address?: string
}

export interface SafeAreaInfo {
  safeAreaTop: number
  safeAreaBottom: number
  safeAreaLeft: number
  safeAreaRight: number
}

export interface UploadResult {
  url: string
  status: number
  ok: boolean
  /** 响应体，超长会被截断，避免撑爆 H5 日志。 */
  body: string
  size: number
  durationMs: number
}

export interface PreviewResult {
  action: 'closed' | 'opened-external'
  uri: string
}

export interface AppInfo {
  appName: string
  appVersion: string
  platform: string
  osName: string
  osVersion: string
  deviceName: string
  isDevice: boolean
  isDev: boolean
}

/** 上传进度事件：`jsbridge.on('uploadProgress', ...)`。 */
export interface UploadProgressEvent {
  requestId: string
  loaded: number
  total: number
  percent: number
}
