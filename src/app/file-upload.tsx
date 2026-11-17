import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Button, Card, CodeBlock, Input, KeyValue, Screen, Section } from '@/components/ui'
import { formatBytes, pickDocument, uploadMediaFile } from '@/jsbridge/media'
import { BridgeError, type MediaAsset, type UploadResult } from '@/jsbridge/protocol'
import { colors, fonts, radius, spacing } from '@/theme'

const DEFAULT_ENDPOINT = 'https://httpbin.org/post'

export default function FileUploadScreen() {
  const [file, setFile] = useState<MediaAsset | null>(null)
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pick = async () => {
    setError(null)
    try {
      setFile(await pickDocument())
      setResult(null)
      setProgress(0)
    } catch (pickError: unknown) {
      if (pickError instanceof BridgeError && pickError.code === 4001) {
        return
      }
      setError(pickError instanceof Error ? pickError.message : '选择文件失败')
    }
  }

  const upload = async () => {
    if (!file || busy) {
      return
    }

    setBusy(true)
    setProgress(0)
    setResult(null)
    setError(null)

    try {
      const uploaded = await uploadMediaFile({
        url: endpoint.trim(),
        fileUri: file.uri,
        mimeType: file.mimeType,
        fieldName: 'file',
        onProgress: (loaded, total) => {
          setProgress(total > 0 ? Math.round((loaded / total) * 100) : 0)
        },
      })

      setProgress(100)
      setResult(uploaded)
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : '上传失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Section title="上传目标">
        <Card style={styles.card}>
          <Text style={styles.label}>接口地址</Text>
          <Input
            value={endpoint}
            onChangeText={setEndpoint}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://your-api.com/upload"
            style={styles.input}
          />
          <Text style={styles.hint}>
            默认指向 httpbin.org 的回显接口，会原样返回收到的 multipart 字段，方便验证上传结果。
          </Text>
        </Card>
      </Section>

      <Section title="待上传文件">
        <Card style={styles.card}>
          {file ? (
            <>
              <View style={styles.fileHead}>
                <View style={styles.fileIcon}>
                  <Ionicons
                    name="document-attach-outline"
                    size={20}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.fileInfo}>
                  <Text
                    style={styles.fileName}
                    numberOfLines={1}
                  >
                    {file.name}
                  </Text>
                  <Text style={styles.fileMeta}>
                    {file.mimeType} · {formatBytes(file.size)}
                  </Text>
                </View>
                <Button
                  label="重选"
                  variant="ghost"
                  onPress={pick}
                />
              </View>
              <KeyValue
                label="本地 URI"
                value={file.uri}
              />
            </>
          ) : (
            <Button
              label="选择文件"
              icon="folder-open-outline"
              onPress={pick}
            />
          )}
        </Card>
      </Section>

      <Section title="上传">
        <Card style={styles.card}>
          <Button
            label={busy ? '上传中' : '开始上传'}
            icon="cloud-upload-outline"
            onPress={upload}
            loading={busy}
            disabled={!file}
          />

          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>
      </Section>

      {result ? (
        <Section title="响应">
          <Card style={styles.card}>
            <KeyValue
              label="状态码"
              value={String(result.status)}
            />
            <KeyValue
              label="文件大小"
              value={formatBytes(result.size)}
            />
            <KeyValue
              label="耗时"
              value={`${result.durationMs} ms`}
            />
            <CodeBlock numberOfLines={10}>{result.body || '(空响应)'}</CodeBlock>
          </Card>
        </Section>
      ) : null}

      <Section title="对应桥接方法">
        <CodeBlock>
          jsbridge.uploadFile({'{ url, filePath, fileName, mimeType }'}){'\n'}
          {'// 进度通过事件通道下发：'}
          {'\n'}
          {"jsbridge.on('uploadProgress', ({ percent }) => …)"}
        </CodeBlock>
        <Text style={styles.note}>
          上传进度不占用请求响应通道，而是用 window.onNativeEvent('uploadProgress', …) 单独推送，H5 侧用 jsbridge.on
          订阅。
        </Text>
      </Section>
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  label: {
    fontSize: 12,
    color: colors.subtext,
  },
  input: {
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.faint,
  },
  fileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fileIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.accentWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.text,
  },
  fileMeta: {
    fontSize: 11,
    color: colors.faint,
    fontFamily: fonts.mono,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#EEF0F3',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  progressText: {
    fontSize: 11,
    color: colors.subtext,
    fontFamily: fonts.mono,
    textAlign: 'right',
  },
  error: {
    fontSize: 12,
    color: colors.danger,
  },
  note: {
    fontSize: 11.5,
    lineHeight: 18,
    color: colors.subtext,
    paddingHorizontal: spacing.xs,
  },
})
