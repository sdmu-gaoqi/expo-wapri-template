import { Ionicons } from '@expo/vector-icons'
import { useRouter, type Href } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Badge, Card } from '@/components/ui'
import { colors, fonts, radius, spacing } from '@/theme'

const DEMOS: Array<{
  href: Href
  title: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
  tint: string
}> = [
  {
    href: '/camera',
    title: '相机',
    description: 'expo-camera 预览与拍照',
    icon: 'camera-outline',
    tint: '#2563EB',
  },
  {
    href: '/phone',
    title: '拨打电话',
    description: 'tel: 调起系统拨号',
    icon: 'call-outline',
    tint: '#0891B2',
  },
  {
    href: '/location',
    title: '定位',
    description: '前台定位 + 逆地理编码',
    icon: 'location-outline',
    tint: '#15803D',
  },
  {
    href: '/file-preview',
    title: '文件预览',
    description: '图片 / 文本 / 系统打开',
    icon: 'document-text-outline',
    tint: '#B45309',
  },
  {
    href: '/file-upload',
    title: '文件上传',
    description: 'multipart 上传 + 进度',
    icon: 'cloud-upload-outline',
    tint: '#7C3AED',
  },
]

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      <View style={styles.hero}>
        <View style={styles.heroHead}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>JB</Text>
          </View>
          <Badge
            label="SDK 58"
            tone="accent"
          />
        </View>
        <Text style={styles.title}>Expo 容器模板</Text>
        <Text style={styles.subtitle}>
          一套可复用的 WebView 容器骨架：原生能力用 Expo 实现，H5 通过 JSBridge 协议调用。
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/webview')}
        style={({ pressed }) => [styles.primaryCard, pressed && styles.pressed]}
      >
        <View style={styles.primaryIcon}>
          <Ionicons
            name="code-slash-outline"
            size={22}
            color={colors.white}
          />
        </View>
        <View style={styles.primaryText}>
          <Text style={styles.primaryTitle}>H5 + JSBridge 演示</Text>
          <Text style={styles.primaryDesc}>本地 H5 页面 · 10 个原生方法 · 实时报文日志</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color="rgba(255,255,255,0.7)"
        />
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>原生能力</Text>
        <View style={styles.grid}>
          {DEMOS.map((item) => (
            <Pressable
              key={item.href.toString()}
              accessibilityRole="button"
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]}
            >
              <View style={[styles.gridIcon, { backgroundColor: `${item.tint}14` }]}>
                <Ionicons
                  name={item.icon}
                  size={19}
                  color={item.tint}
                />
              </View>
              <Text style={styles.gridTitle}>{item.title}</Text>
              <Text style={styles.gridDesc}>{item.description}</Text>
            </Pressable>
          ))}
          <View style={[styles.gridItem, styles.gridItemGhost]}>
            <View style={[styles.gridIcon, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons
                name="add"
                size={19}
                color={colors.subtext}
              />
            </View>
            <Text style={styles.gridTitle}>扩展方法</Text>
            <Text style={styles.gridDesc}>改 handlers.ts 即可</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>协议速览</Text>
        <Card style={styles.protocolCard}>
          <View style={styles.protocolRow}>
            <Text style={styles.protocolLabel}>Android / 鸿蒙</Text>
            <Text style={styles.protocolCode}>
              window.JSBridge.handle({'\n'}
              {'  '}JSON.stringify({'{ method, params, requestId }'}){'\n'})
            </Text>
          </View>
          <View style={styles.protocolDivider} />
          <View style={styles.protocolRow}>
            <Text style={styles.protocolLabel}>iOS</Text>
            <Text style={styles.protocolCode}>
              window.webkit.messageHandlers[method]{'\n'}
              {'  '}.postMessage(JSON.stringify({'{ params, requestId }'}))
            </Text>
          </View>
          <View style={styles.protocolDivider} />
          <View style={styles.protocolRow}>
            <Text style={styles.protocolLabel}>Native → H5</Text>
            <Text style={styles.protocolCode}>
              window.onNativeMessage(JSON.stringify({'{ requestId, code, message, data }'}))
            </Text>
          </View>
        </Card>
      </View>

      <Text style={styles.footer}>模板项目 · 协议实现见 src/jsbridge · H5 示例见 assets/web/index.html</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  hero: {
    gap: spacing.sm,
  },
  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.subtext,
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.82,
  },
  primaryIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    flex: 1,
    gap: 3,
  },
  primaryTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryDesc: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11.5,
    lineHeight: 16,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.subtext,
    letterSpacing: 0.4,
    paddingHorizontal: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    width: '47.7%',
    flexGrow: 1,
    gap: 6,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  gridItemGhost: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  gridIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  gridTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.text,
  },
  gridDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.faint,
  },
  protocolCard: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.code,
    borderColor: colors.code,
  },
  protocolRow: {
    gap: 5,
  },
  protocolLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.codeMuted,
    letterSpacing: 0.3,
  },
  protocolCode: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.codeText,
    fontFamily: fonts.mono,
  },
  protocolDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(148,163,184,0.16)',
    marginVertical: 2,
  },
  footer: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.faint,
    textAlign: 'center',
  },
})
