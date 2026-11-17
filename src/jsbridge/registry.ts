import type { NativeMethod } from './protocol'

export interface ApiConfig {
  /** Native 侧注册的方法名。 */
  nativeMethod: NativeMethod
  /** 该方法的超时时间（毫秒）。H5 侧的同名 registry 需保持一致。 */
  timeout?: number
}

/**
 * 业务方法 -> Native 方法。
 *
 * 与 `@wapri/gjsbridge` 的 `apiRegistry` 同构：H5 只调用第一列的业务方法，
 * 容器按 `nativeMethod` 分发。H5 侧副本见 `assets/web/index.html`。
 */
export const apiRegistry = {
  canIUse: { nativeMethod: 'permission.caniuse' },
  getSafeArea: { nativeMethod: 'getSafeArea' },
  close: { nativeMethod: 'closeWebview' },
  makePhoneCall: { nativeMethod: 'makePhoneCall' },
  takePhoto: { nativeMethod: 'takePhoto', timeout: 120_000 },
  chooseFile: { nativeMethod: 'chooseFile', timeout: 120_000 },
  getLocation: { nativeMethod: 'getLocation', timeout: 30_000 },
  previewFile: { nativeMethod: 'previewFile', timeout: 120_000 },
  uploadFile: { nativeMethod: 'uploadFile', timeout: 120_000 },
  getAppInfo: { nativeMethod: 'getAppInfo' },
} as const satisfies Record<string, ApiConfig>

export type BusinessMethod = keyof typeof apiRegistry
