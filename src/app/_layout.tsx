import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

import { CameraHost } from '@/components/camera-host'
import { FilePreviewHost } from '@/components/file-preview-host'
import { setSafeAreaInsets } from '@/jsbridge/runtime'
import { colors } from '@/theme'

/** 把安全区同步给 Native 方法（jsbridge.getSafeArea 会读它）。 */
function SafeAreaBridge() {
  const insets = useSafeAreaInsets()

  useEffect(() => {
    setSafeAreaInsets(insets)
  }, [insets])

  return null
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaBridge />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { fontSize: 16, fontWeight: '600', color: colors.text },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="webview"
          options={{ title: 'H5 容器' }}
        />
        <Stack.Screen
          name="camera"
          options={{ title: '相机' }}
        />
        <Stack.Screen
          name="phone"
          options={{ title: '拨打电话' }}
        />
        <Stack.Screen
          name="location"
          options={{ title: '定位' }}
        />
        <Stack.Screen
          name="file-preview"
          options={{ title: '文件预览' }}
        />
        <Stack.Screen
          name="file-upload"
          options={{ title: '文件上传' }}
        />
      </Stack>

      {/* 由 Native 方法唤起的两类界面，挂在根节点保证任何页面都能弹出来 */}
      <CameraHost />
      <FilePreviewHost />
    </SafeAreaProvider>
  )
}
