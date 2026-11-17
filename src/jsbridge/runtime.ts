import type { SafeAreaInfo } from './protocol'
import type { UploadProgressEvent } from './protocol'

type Insets = { top: number; right: number; bottom: number; left: number }

/**
 * 容器运行期状态。
 *
 * 这些值由 UI 层（根布局 / WebView 页面）写入，由 Native 方法处理器读取，
 * 避免 handlers 直接依赖 React 上下文。
 */
export const runtime = {
  /** 当前窗口安全区，由根布局用 useSafeAreaInsets 同步。 */
  insets: { top: 0, right: 0, bottom: 0, left: 0 } as Insets,

  /** 关闭当前 WebView 的实现，由 WebView 页面注册。 */
  closeWebview: null as null | (() => void),

  /** 向 H5 下发事件，由 NativeBridge 挂载后注入。 */
  emit: null as null | ((eventName: string, data: unknown) => void),
}

export function setSafeAreaInsets(insets: Insets) {
  runtime.insets = insets
}

export function getSafeAreaInfo(): SafeAreaInfo {
  const { top, bottom, left, right } = runtime.insets

  return {
    safeAreaTop: Math.round(top),
    safeAreaBottom: Math.round(bottom),
    safeAreaLeft: Math.round(left),
    safeAreaRight: Math.round(right),
  }
}

export function emitUploadProgress(payload: UploadProgressEvent) {
  runtime.emit?.('uploadProgress', payload)
}
