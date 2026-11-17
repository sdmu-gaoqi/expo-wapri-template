import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui'
import { cameraQueue, type CameraTask } from '@/jsbridge/interactions'
import { toMediaAsset } from '@/jsbridge/media'
import { BridgeCode, BridgeError } from '@/jsbridge/protocol'
import { colors, fonts, radius, spacing } from '@/theme'

/**
 * 相机宿主。
 *
 * 挂在根布局上，被 `takePhoto` 处理器唤起。用户拍完后把 MediaAsset 交回
 * 挂起的 Promise，从而完成一次 `takePhoto` 的 Native 调用。
 */
export function CameraHost() {
  const [task, setTask] = useState<CameraTask | null>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [flash, setFlash] = useState<'off' | 'on'>('off')
  const [busy, setBusy] = useState(false)
  const [mountError, setMountError] = useState<string | null>(null)
  const cameraRef = useRef<CameraView>(null)
  const insets = useSafeAreaInsets()

  useEffect(() => cameraQueue.subscribe(setTask), [])

  const cancel = () => {
    cameraQueue.reject(new BridgeError(BridgeCode.CANCELLED, '用户取消了拍照'))
  }

  const capture = async () => {
    if (!cameraRef.current || busy) {
      return
    }

    setBusy(true)
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: task?.quality ?? 0.82,
      })

      if (!photo?.uri) {
        throw new BridgeError(BridgeCode.INTERNAL_ERROR, '拍照失败')
      }

      const asset = await toMediaAsset(photo.uri, 'camera', {
        width: photo.width,
        height: photo.height,
      })

      cameraQueue.resolve(asset)
    } catch (error: unknown) {
      cameraQueue.reject(
        error instanceof BridgeError ? error : new BridgeError(BridgeCode.INTERNAL_ERROR, '拍照失败，请重试'),
      )
    } finally {
      setBusy(false)
    }
  }

  const granted = permission?.granted ?? false

  return (
    <Modal
      visible={Boolean(task)}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={cancel}
    >
      <View style={styles.root}>
        {granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            flash={flash}
            onMountError={(event) => setMountError(event.message ?? '相机启动失败')}
          />
        ) : (
          <View style={styles.permissionPanel}>
            <View style={styles.permissionIcon}>
              <Ionicons
                name="camera-outline"
                size={26}
                color={colors.accent}
              />
            </View>
            <Text style={styles.permissionTitle}>需要相机权限</Text>
            <Text style={styles.permissionText}>H5 通过 takePhoto 调用容器相机，容器会在这里请求系统权限。</Text>

            {permission === null ? (
              <ActivityIndicator color={colors.accent} />
            ) : permission.canAskAgain ? (
              <Button
                label="允许使用相机"
                onPress={requestPermission}
              />
            ) : (
              <Button
                label="前往系统设置"
                onPress={() => Linking.openSettings()}
              />
            )}
            <Button
              label="取消"
              variant="ghost"
              onPress={cancel}
            />
          </View>
        )}

        {granted ? (
          <>
            <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="关闭相机"
                onPress={cancel}
                style={styles.roundButton}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={colors.white}
                />
              </Pressable>

              <Text style={styles.topTitle}>拍照</Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="切换闪光灯"
                onPress={() => setFlash((current) => (current === 'off' ? 'on' : 'off'))}
                style={styles.roundButton}
              >
                <Ionicons
                  name={flash === 'off' ? 'flash-off' : 'flash'}
                  size={18}
                  color={colors.white}
                />
              </Pressable>
            </View>

            {mountError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{mountError}</Text>
              </View>
            ) : null}

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.xl }]}>
              <View style={styles.sideSlot} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="拍照"
                disabled={busy}
                onPress={capture}
                style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
              >
                {busy ? <ActivityIndicator color={colors.text} /> : <View style={styles.shutterInner} />}
              </Pressable>
              <View style={styles.sideSlot}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="切换前后摄像头"
                  onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
                  style={styles.roundButton}
                >
                  <Ionicons
                    name="camera-reverse-outline"
                    size={20}
                    color={colors.white}
                  />
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sideSlot: {
    width: 60,
    alignItems: 'flex-end',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    opacity: 0.7,
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.white,
  },
  errorBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 160,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(220,38,38,0.9)',
  },
  errorText: {
    color: colors.white,
    fontSize: 12,
    textAlign: 'center',
  },
  permissionPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  permissionText: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.68)',
    textAlign: 'center',
    fontFamily: fonts.mono,
    marginBottom: spacing.sm,
  },
})
