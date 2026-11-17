import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { Linking, Platform } from 'react-native'

import { cameraQueue, previewQueue } from './interactions'
import { ensureLocalFile, guessMimeType, pickDocument, toMediaAsset, uploadMediaFile } from './media'
import { BridgeCode, BridgeError, type AppInfo, type GeoInfo } from './protocol'
import { emitUploadProgress, getSafeAreaInfo, runtime } from './runtime'

export interface BridgeContext {
  requestId: string
  method: string
}

export type BridgeHandler = (params: Record<string, unknown>, context: BridgeContext) => Promise<unknown>

function requireString(params: Record<string, unknown>, key: string): string {
  const value = params[key]
  const text = typeof value === 'string' ? value.trim() : ''

  if (!text) {
    throw new BridgeError(BridgeCode.INVALID_PARAMS, `缺少参数 ${key}`)
  }

  return text
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new BridgeError(BridgeCode.INTERNAL_ERROR, message)), ms)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

/* -------------------------------------------------------------------------- */
/* 基础能力                                                                    */
/* -------------------------------------------------------------------------- */

/** `permission.caniuse`：容器是否实现了某个 Native 方法。 */
const canIUse: BridgeHandler = async (params) => {
  const api = requireString(params, 'api')
  return { result: SUPPORTED_METHODS.has(api) ? '1' : '0' }
}

const getSafeArea: BridgeHandler = async () => getSafeAreaInfo()

/** `closeWebview`：先回包，再关闭，保证 H5 收得到 code 0。 */
const closeWebview: BridgeHandler = async () => {
  setTimeout(() => runtime.closeWebview?.(), 150)
  return undefined
}

const makePhoneCall: BridgeHandler = async (params) => {
  const raw = requireString(params, 'phoneNumber')
  const phoneNumber = raw.replace(/[^\d+*#]/g, '')

  if (!phoneNumber) {
    throw new BridgeError(BridgeCode.INVALID_PARAMS, '号码格式不正确')
  }

  try {
    await Linking.openURL(`tel:${phoneNumber}`)
  } catch {
    throw new BridgeError(BridgeCode.INTERNAL_ERROR, '当前设备无法发起拨号')
  }

  return undefined
}

/** 容器与设备信息快照，同时用于注入脚本的 `__BRIDGE_ENV__`。 */
export function getAppInfoSnapshot(): AppInfo {
  return {
    appName: Constants.expoConfig?.name ?? 'Expo Demo',
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    platform: Platform.OS,
    osName: Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web',
    osVersion: String(Device.osVersion ?? ''),
    deviceName: Device.modelName ?? 'Unknown',
    isDevice: Boolean(Device.isDevice),
    isDev: __DEV__,
  }
}

const getAppInfo: BridgeHandler = async () => getAppInfoSnapshot()

/* -------------------------------------------------------------------------- */
/* 相机                                                                        */
/* -------------------------------------------------------------------------- */

const takePhoto: BridgeHandler = async (params) => {
  const source = params.source === 'library' ? 'library' : 'camera'
  const quality = Math.min(1, Math.max(0.3, toNumber(params.quality, 0.82)))

  if (source === 'library') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      throw new BridgeError(BridgeCode.PERMISSION_DENIED, '相册权限未授予')
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality,
      allowsMultipleSelection: false,
    })

    const asset = result.canceled ? undefined : result.assets?.[0]
    if (!asset) {
      throw new BridgeError(BridgeCode.CANCELLED, '用户取消了选择')
    }

    return toMediaAsset(asset.uri, 'library', {
      name: asset.fileName ?? undefined,
      mimeType: asset.mimeType,
      size: asset.fileSize,
      width: asset.width,
      height: asset.height,
    })
  }

  // 相机走 Native 页面：根布局里的 CameraHost 会渲染取景器并返回结果。
  return cameraQueue.ask({ quality })
}

/* -------------------------------------------------------------------------- */
/* 文件                                                                        */
/* -------------------------------------------------------------------------- */

const chooseFile: BridgeHandler = async (params) => {
  const mimeTypes = params.mimeTypes

  return pickDocument(
    typeof mimeTypes === 'string' || Array.isArray(mimeTypes) ? (mimeTypes as string | string[]) : undefined,
  )
}

const previewFile: BridgeHandler = async (params) => {
  const url = requireString(params, 'url')
  const declaredName = typeof params.name === 'string' ? params.name : ''
  const declaredMime = typeof params.mimeType === 'string' ? params.mimeType : ''

  const file = await ensureLocalFile(url, declaredName)
  const name = declaredName || file.name
  const mimeType = declaredMime || file.type || guessMimeType(name)

  const result = await previewQueue.ask({
    uri: file.uri,
    name,
    mimeType,
    size: file.size,
  })

  return { action: result.action, uri: file.uri }
}

const uploadFile: BridgeHandler = async (params, context) => {
  const url = requireString(params, 'url')
  const filePath = requireString(params, 'filePath')
  const mimeType = typeof params.mimeType === 'string' ? params.mimeType : undefined
  const fieldName = typeof params.fieldName === 'string' ? params.fieldName : 'file'
  const fields = normalizeFields(params.fields)

  // 允许直接传远程地址：先落到缓存，再按本地文件上传。
  const localFile = /^https?:\/\//i.test(filePath)
    ? await ensureLocalFile(filePath, typeof params.fileName === 'string' ? params.fileName : undefined)
    : undefined

  return uploadMediaFile({
    url,
    fileUri: localFile?.uri ?? filePath,
    mimeType,
    fieldName,
    fields,
    onProgress: (loaded, total) => {
      emitUploadProgress({
        requestId: context.requestId,
        loaded,
        total,
        percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
      })
    },
  })
}

function normalizeFields(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined && item !== null)
    .map(([key, item]) => [key, String(item)] as const)

  return entries.length ? Object.fromEntries(entries) : undefined
}

/* -------------------------------------------------------------------------- */
/* 定位                                                                        */
/* -------------------------------------------------------------------------- */

const getLocation: BridgeHandler = async (params) => {
  const highAccuracy = params.highAccuracy !== false

  const permission = await Location.requestForegroundPermissionsAsync()
  if (permission.status !== 'granted') {
    throw new BridgeError(
      BridgeCode.PERMISSION_DENIED,
      permission.canAskAgain ? '定位权限未授予' : '定位权限已被拒绝，请到系统设置中开启',
    )
  }

  const position = await withTimeout(
    Location.getCurrentPositionAsync({
      accuracy: highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
    }),
    12_000,
    '定位超时，请到空旷处重试',
  ).catch(async (error: unknown) => {
    const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null)
    if (lastKnown) {
      return lastKnown
    }
    throw error
  })

  const { coords, timestamp } = position
  const info: GeoInfo = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy ?? 0,
    altitude: coords.altitude ?? null,
    heading: coords.heading ?? null,
    speed: coords.speed ?? null,
    timestamp: new Date(timestamp).toISOString(),
  }

  try {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    })
    info.address = formatPlace(place)
  } catch {
    // 逆地理编码依赖系统服务，失败时不影响坐标返回。
  }

  return info
}

function formatPlace(place?: Location.LocationGeocodedAddress): string | undefined {
  if (!place) {
    return undefined
  }

  const parts = [place.country, place.region, place.city, place.district, place.street, place.name].filter(
    (part): part is string => Boolean(part && part.trim()),
  )

  return Array.from(new Set(parts)).join('') || undefined
}

/* -------------------------------------------------------------------------- */
/* 注册表                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Native 方法实现表。
 *
 * key 必须与 `registry.ts` 里的 `nativeMethod` 一致；`canIUse` 直接用这张表判断能力。
 */
export const handlers: Record<string, BridgeHandler> = {
  'permission.caniuse': canIUse,
  getSafeArea,
  closeWebview,
  makePhoneCall,
  takePhoto,
  chooseFile,
  getLocation,
  previewFile,
  uploadFile,
  getAppInfo,
}

export const SUPPORTED_METHODS = new Set(Object.keys(handlers))
