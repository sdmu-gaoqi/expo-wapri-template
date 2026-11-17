import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Image } from 'expo-image'
import { useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { Button, Card, CodeBlock, KeyValue, Screen, Section } from '@/components/ui'
import { formatBytes, toMediaAsset } from '@/jsbridge/media'
import type { MediaAsset } from '@/jsbridge/protocol'
import { colors, spacing } from '@/theme'

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [photo, setPhoto] = useState<MediaAsset | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraRef = useRef<CameraView>(null)

  const capture = async () => {
    if (!cameraRef.current || busy) {
      return
    }

    setBusy(true)
    setError(null)

    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.82 })
      if (!result?.uri) {
        throw new Error('未拿到照片')
      }

      setPhoto(
        await toMediaAsset(result.uri, 'camera', {
          width: result.width,
          height: result.height,
        }),
      )
    } catch (captureError: unknown) {
      setError(captureError instanceof Error ? captureError.message : '拍照失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Section
        title="取景器"
        hint="expo-camera"
      >
        <Card style={styles.previewCard}>
          {permission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={styles.preview}
              facing={facing}
            />
          ) : (
            <View style={styles.permission}>
              <Ionicons
                name="camera-outline"
                size={28}
                color={colors.accent}
              />
              <Text style={styles.permissionTitle}>{permission === null ? '正在检查相机权限…' : '需要相机权限'}</Text>
              <Text style={styles.permissionText}>相机的系统权限由 expo-camera 申请，容器和 H5 共用同一份授权。</Text>
              {permission === null ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Button
                  label="授权相机"
                  onPress={requestPermission}
                />
              )}
            </View>
          )}
        </Card>

        <View style={styles.actions}>
          <Button
            label={busy ? '处理中' : '拍照'}
            icon="camera"
            onPress={capture}
            loading={busy}
            disabled={!permission?.granted}
            style={styles.flex}
          />
          <Button
            label="翻转"
            variant="ghost"
            icon="camera-reverse-outline"
            onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Section>

      {photo ? (
        <Section title="拍摄结果">
          <Card>
            <Image
              source={{ uri: photo.uri }}
              style={styles.photo}
              contentFit="cover"
            />
            <View style={styles.meta}>
              <KeyValue
                label="文件名"
                value={photo.name}
              />
              <KeyValue
                label="类型"
                value={photo.mimeType}
              />
              <KeyValue
                label="大小"
                value={formatBytes(photo.size)}
              />
              <KeyValue
                label="尺寸"
                value={photo.width && photo.height ? `${photo.width} × ${photo.height}` : '未知'}
              />
              <KeyValue
                label="URI"
                value={photo.uri}
              />
            </View>
          </Card>
        </Section>
      ) : null}

      <Section title="对应桥接方法">
        <CodeBlock>
          jsbridge.takePhoto({'{ source: "camera", quality: 0.82 }'}){'\n'}
          {'// → { uri, name, mimeType, size, thumbnail }'}
        </CodeBlock>
        <Text style={styles.note}>
          H5 调用时由根布局的 CameraHost 弹出全屏取景器，拍完把同样的 MediaAsset 结构回传。 相册选择分支走
          expo-image-picker，返回结构一致。
        </Text>
      </Section>
    </Screen>
  )
}

const styles = StyleSheet.create({
  previewCard: {
    height: 300,
    backgroundColor: '#0B1020',
    justifyContent: 'center',
  },
  preview: {
    flex: 1,
  },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  permissionText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    paddingHorizontal: spacing.xs,
  },
  photo: {
    width: '100%',
    height: 220,
    backgroundColor: '#0B1020',
  },
  meta: {
    padding: spacing.lg,
  },
  note: {
    fontSize: 11.5,
    lineHeight: 18,
    color: colors.subtext,
    paddingHorizontal: spacing.xs,
  },
})
