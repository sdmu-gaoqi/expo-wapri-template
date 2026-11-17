import * as DocumentPicker from 'expo-document-picker'
import { Directory, File, Paths, UploadType } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

import { BridgeCode, BridgeError, type MediaAsset, type UploadResult } from './protocol'

const DOWNLOAD_DIRECTORY = 'jsbridge-downloads'

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  xml: 'application/xml',
  yml: 'text/yaml',
  yaml: 'text/yaml',
  html: 'text/html',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

export type PreviewKind = 'image' | 'text' | 'other'

export function extensionOf(name: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name)
  return match ? match[1].toLowerCase() : ''
}

export function guessMimeType(name: string): string {
  return MIME_BY_EXTENSION[extensionOf(name)] ?? 'application/octet-stream'
}

export function formatBytes(size?: number): string {
  if (!size || size <= 0) {
    return '未知大小'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export function previewKind(mimeType: string, name = ''): PreviewKind {
  const mime = (mimeType || guessMimeType(name)).toLowerCase()

  if (mime.startsWith('image/')) {
    return 'image'
  }
  if (
    mime.startsWith('text/') ||
    /json|xml|javascript|typescript|yaml|csv|markdown/.test(mime) ||
    /^(md|txt|log|json|csv|xml|ya?ml|html?|css|jsx?|tsx?)$/.test(extensionOf(name))
  ) {
    return 'text'
  }

  return 'other'
}

function nameFromUri(uri: string): string {
  const clean = uri.split('?')[0].split('#')[0]
  const last = clean.split('/').filter(Boolean).pop()
  return last ? decodeURIComponent(last) : `file-${Date.now()}`
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 80) || `file-${Date.now()}`
}

/**
 * 生成小尺寸缩略图（data URI）。
 *
 * H5 页面无法直接访问 App 沙盒里的 file:// 文件，所以拍照 / 选图后附带
 * 一张压缩过的 base64 图，WebView 里可以直接展示。
 */
export async function createThumbnail(uri: string): Promise<string | undefined> {
  try {
    const context = ImageManipulator.manipulate(uri, { maxWidth: 720 })
    const image = await context.resize({ width: 480 }).renderAsync()
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true })

    return result.base64 ? `data:image/jpeg;base64,${result.base64}` : undefined
  } catch {
    return undefined
  }
}

/** 把不同来源的文件统一成 MediaAsset。 */
export async function toMediaAsset(
  uri: string,
  source: MediaAsset['source'],
  extra: {
    name?: string
    mimeType?: string
    size?: number
    width?: number
    height?: number
  } = {},
): Promise<MediaAsset> {
  let name = extra.name || nameFromUri(uri)
  let mimeType = extra.mimeType || guessMimeType(name)
  let size = extra.size ?? 0

  try {
    const file = new File(uri)
    if (file.exists) {
      size = size || file.size
      name = extra.name || file.name || name
      mimeType = extra.mimeType || file.type || mimeType
    }
  } catch {
    // content:// 或权限受限时读不到元信息，保留入参里的值即可。
  }

  const asset: MediaAsset = {
    uri,
    name,
    mimeType,
    size,
    source,
    width: extra.width,
    height: extra.height,
  }

  if (mimeType.startsWith('image/')) {
    asset.thumbnail = await createThumbnail(uri)
  }

  return asset
}

/** 调起系统文件选择器，并把文件复制到缓存目录。 */
export async function pickDocument(mimeTypes?: string | string[]): Promise<MediaAsset> {
  const result = await DocumentPicker.getDocumentAsync({
    type: mimeTypes ?? '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  })

  if (result.canceled || !result.assets?.length) {
    throw new BridgeError(BridgeCode.CANCELLED, '用户取消了选择')
  }

  const asset = result.assets[0]

  return toMediaAsset(asset.uri, 'picker', {
    name: asset.name,
    mimeType: asset.mimeType,
    size: asset.size,
  })
}

/**
 * 保证拿到一个本地文件。
 *
 * - http(s)：下载到缓存目录（带原文件名，便于预览时显示）
 * - file:// / content://：直接使用
 */
export async function ensureLocalFile(url: string, name?: string): Promise<File> {
  if (!/^https?:\/\//i.test(url)) {
    const file = new File(url)
    if (!file.exists) {
      throw new BridgeError(BridgeCode.INVALID_PARAMS, `文件不存在：${url}`)
    }
    return file
  }

  const directory = new Directory(Paths.cache, DOWNLOAD_DIRECTORY)
  if (!directory.exists) {
    directory.create({ intermediates: true })
  }

  const fileName = `${Date.now()}-${sanitizeFileName(name || nameFromUri(url))}`
  const target = new File(directory, fileName)

  return File.downloadFileAsync(url, target, { idempotent: true })
}

export interface UploadFileOptions {
  url: string
  fileUri: string
  mimeType?: string
  fieldName?: string
  fields?: Record<string, string>
  onProgress?: (loaded: number, total: number) => void
}

/** multipart/form-data 上传，进度通过 onProgress 回调。 */
export async function uploadMediaFile(options: UploadFileOptions): Promise<UploadResult> {
  if (!/^https?:\/\//i.test(options.url)) {
    throw new BridgeError(BridgeCode.INVALID_PARAMS, '上传地址必须是 http(s) URL')
  }

  const file = new File(options.fileUri)
  if (!file.exists) {
    throw new BridgeError(BridgeCode.INVALID_PARAMS, '待上传的文件不存在')
  }

  const startedAt = Date.now()
  const response = await file.upload(options.url, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: options.fieldName || 'file',
    mimeType: options.mimeType || file.type || 'application/octet-stream',
    parameters: options.fields,
    onProgress: ({ bytesSent, totalBytes }) => options.onProgress?.(bytesSent, totalBytes),
  })

  const body = response.body ?? ''

  return {
    url: options.url,
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    body: body.length > 4000 ? `${body.slice(0, 4000)}…` : body,
    size: file.size,
    durationMs: Date.now() - startedAt,
  }
}

/** 读取文本文件内容，超长截断，避免一次性塞爆界面。 */
export async function readTextPreview(file: File, maxChars = 20_000): Promise<string> {
  const text = await file.text()
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n… 内容过长，已截断` : text
}
