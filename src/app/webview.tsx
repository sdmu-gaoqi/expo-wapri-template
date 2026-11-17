import { Ionicons } from '@expo/vector-icons'
import { Asset } from 'expo-asset'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState, type ForwardRefExoticComponent, type RefAttributes } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView as RNWebView, type WebViewProps } from 'react-native-webview'

import webIndexHtml from '../../assets/web/index.html'

import { getAppInfoSnapshot } from '@/jsbridge/handlers'
import { buildInjectionScript, type BridgePlatform } from '@/jsbridge/injection'
import { NativeBridge, type BridgePacket } from '@/jsbridge/native'
import { runtime } from '@/jsbridge/runtime'
import { colors, fonts, radius, spacing } from '@/theme'

/**
 * react-native-webview 的类组件默认泛型是 `undefined`，在 React 19 的类型下
 * `WebViewProps & undefined` 会退化成 never，JSX 无法通过类型检查。
 * 这里显式收敛一次，保持页面代码干净。
 */
const WebView = RNWebView as unknown as ForwardRefExoticComponent<WebViewProps & RefAttributes<RNWebView>>

const INJECTION_APP_INFO = getAppInfoSnapshot()

export default function WebViewScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const webViewRef = useRef<RNWebView>(null)
  const [bridge] = useState(() => new NativeBridge())

  const [localUri, setLocalUri] = useState<string | null>(null)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [platform, setPlatform] = useState<BridgePlatform>('android')
  const [reloadKey, setReloadKey] = useState(0)
  const [customUrl, setCustomUrl] = useState('')
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [urlPanelOpen, setUrlPanelOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [packets, setPackets] = useState<BridgePacket[]>([])
  const [logOpen, setLogOpen] = useState(true)

  /* ---- 加载打包进 assets 的 H5 页面 ---- */
  useEffect(() => {
    let cancelled = false

    Asset.fromModule(webIndexHtml)
      .downloadAsync()
      .then((asset) => {
        if (cancelled) {
          return
        }
        setLocalUri(asset.localUri ?? asset.uri)
      })
      .catch(() => {
        if (!cancelled) {
          setSourceError('H5 资源加载失败，请重新构建应用')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  /* ---- 把 injectJavaScript 交给 NativeBridge，并订阅报文日志 ---- */
  useEffect(() => bridge.attach((js) => webViewRef.current?.injectJavaScript(js)), [bridge])

  useEffect(
    () =>
      bridge.subscribe((packet) => {
        setPackets((current) => [...current.slice(-49), packet])
      }),
    [bridge],
  )

  /* ---- closeWebview 由当前页面接管 ---- */
  useEffect(() => {
    runtime.closeWebview = () => router.back()
    return () => {
      runtime.closeWebview = null
    }
  }, [router])

  const injection = useMemo(() => buildInjectionScript(platform, INJECTION_APP_INFO), [platform])

  const source = loadedUrl ?? localUri

  const readAccessUrl = useMemo(() => {
    if (!source || loadedUrl) {
      return undefined
    }
    const index = source.lastIndexOf('/')
    return index > 0 ? source.slice(0, index + 1) : undefined
  }, [source, loadedUrl])

  const reload = () => {
    setSourceError(null)
    setReloadKey((current) => current + 1)
  }

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <View style={styles.segment}>
          {(['android', 'ios'] as BridgePlatform[]).map((item) => {
            const active = platform === item

            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => setPlatform(item)}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {item === 'android' ? 'Android' : 'iOS'}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.toolbarActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="加载自定义地址"
            onPress={() => setUrlPanelOpen((open) => !open)}
            style={[styles.iconButton, urlPanelOpen && styles.iconButtonActive]}
          >
            <Ionicons
              name="link-outline"
              size={17}
              color={colors.subtext}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="刷新"
            onPress={reload}
            style={styles.iconButton}
          >
            <Ionicons
              name="refresh"
              size={17}
              color={colors.subtext}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="切换日志"
            onPress={() => setLogOpen((open) => !open)}
            style={[styles.iconButton, logOpen && styles.iconButtonActive]}
          >
            <Ionicons
              name="terminal-outline"
              size={17}
              color={colors.subtext}
            />
          </Pressable>
        </View>
      </View>

      {urlPanelOpen ? (
        <View style={styles.urlPanel}>
          <TextInput
            value={customUrl}
            onChangeText={setCustomUrl}
            placeholder="https://your-h5.example.com"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.urlInput}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              const next = customUrl.trim()
              if (!next) {
                return
              }
              setLoadedUrl(next)
              setSourceError(null)
              setReloadKey((current) => current + 1)
            }}
            style={styles.urlButton}
          >
            <Text style={styles.urlButtonText}>加载</Text>
          </Pressable>
          {loadedUrl ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setLoadedUrl(null)
                reload()
              }}
              style={[styles.urlButton, styles.urlButtonGhost]}
            >
              <Text style={[styles.urlButtonText, { color: colors.subtext }]}>本地</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {sourceError ? (
        <View style={styles.banner}>
          <Ionicons
            name="alert-circle-outline"
            size={15}
            color={colors.danger}
          />
          <Text style={styles.bannerText}>{sourceError}</Text>
        </View>
      ) : null}

      <View style={styles.webviewWrap}>
        {source ? (
          <WebView
            key={`${platform}-${reloadKey}-${loadedUrl ?? 'local'}`}
            ref={webViewRef}
            source={{ uri: source }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            allowFileAccess
            allowingReadAccessToURL={readAccessUrl}
            injectedJavaScriptBeforeContentLoaded={injection}
            onMessage={(event) => {
              void bridge.receive(event.nativeEvent.data)
            }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={(event) => {
              setLoading(false)
              setSourceError(event.nativeEvent.description || 'WebView 加载失败')
            }}
            setSupportMultipleWindows={false}
            style={styles.webview}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>正在准备本地 H5 页面…</Text>
          </View>
        )}

        {loading && source ? (
          <View
            style={styles.loadingOverlay}
            pointerEvents="none"
          >
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}
      </View>

      {logOpen ? (
        <View style={[styles.logPanel, { paddingBottom: insets.bottom + spacing.xs }]}>
          <View style={styles.logHead}>
            <Text style={styles.logTitle}>原生侧报文</Text>
            <Text style={styles.logCount}>{packets.length}</Text>
            <View style={styles.spacer} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setPackets([])}
            >
              <Text style={styles.logAction}>清空</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.logScroll}
            contentContainerStyle={styles.logContent}
          >
            {packets.length === 0 ? (
              <Text style={styles.logEmpty}>在 H5 页面点击按钮，这里会实时显示每次调用的原始报文。</Text>
            ) : (
              packets.map((packet, index) => (
                <View
                  key={`${packet.at}-${index}`}
                  style={styles.logEntry}
                >
                  <Text
                    style={[
                      styles.logArrow,
                      {
                        color: packet.direction === 'in' ? '#60A5FA' : packet.code === 0 ? '#34D399' : '#F87171',
                      },
                    ]}
                  >
                    {packet.direction === 'in' ? '→' : '←'}
                  </Text>
                  <View style={styles.logEntryBody}>
                    <Text
                      style={styles.logMethod}
                      numberOfLines={1}
                    >
                      {packet.method}
                      {packet.code !== undefined ? `  code ${packet.code}` : ''}
                    </Text>
                    <Text
                      style={styles.logBody}
                      numberOfLines={2}
                    >
                      {packet.body}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: '#F3F4F6',
  },
  segmentItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  segmentItemActive: {
    backgroundColor: colors.card,
  },
  segmentText: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  iconButtonActive: {
    backgroundColor: colors.accentWeak,
  },
  urlPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  urlInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.mono,
  },
  urlButton: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  urlButtonGhost: {
    backgroundColor: '#F3F4F6',
  },
  urlButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.white,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.dangerWeak,
  },
  bannerText: {
    flex: 1,
    fontSize: 11.5,
    color: colors.danger,
  },
  webviewWrap: {
    flex: 1,
    backgroundColor: colors.card,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.card,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 12,
    color: colors.faint,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  logPanel: {
    backgroundColor: colors.code,
    maxHeight: 190,
  },
  logHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 6,
  },
  logTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.codeMuted,
    letterSpacing: 0.4,
  },
  logCount: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: fonts.mono,
  },
  spacer: {
    flex: 1,
  },
  logAction: {
    fontSize: 11,
    color: '#94A3B8',
  },
  logScroll: {
    maxHeight: 152,
  },
  logContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  logEntry: {
    flexDirection: 'row',
    gap: 6,
  },
  logArrow: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  logEntryBody: {
    flex: 1,
  },
  logMethod: {
    fontSize: 11,
    color: '#E2E8F0',
    fontFamily: fonts.mono,
  },
  logBody: {
    fontSize: 10.5,
    lineHeight: 15,
    color: '#94A3B8',
    fontFamily: fonts.mono,
  },
  logEmpty: {
    fontSize: 11,
    lineHeight: 16,
    color: '#64748B',
    paddingVertical: spacing.sm,
  },
})
