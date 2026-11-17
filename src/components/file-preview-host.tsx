import { Ionicons } from '@expo/vector-icons'
import { File } from 'expo-file-system'
import { Image } from 'expo-image'
import * as Sharing from 'expo-sharing'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui'
import { previewQueue, type PreviewTask } from '@/jsbridge/interactions'
import { formatBytes, previewKind, readTextPreview } from '@/jsbridge/media'
import { colors, fonts, radius, spacing } from '@/theme'

/** 文本读取结果，带 uri 一起存，用于判断是否属于当前文件。 */
interface TextResult {
  uri: string
  content: string | null
  error: string | null
}

/** 「用其他应用打开」的报错，同样绑定 uri。 */
interface OpenError {
  uri: string
  message: string
}

/**
 * 文件预览宿主。
 *
 * - 图片：内置查看器（深色背景，撑满宽度）
 * - 文本 / JSON / Markdown：直接读取内容展示
 * - 其它类型：交给系统「用其他应用打开」（Quick Look / ACTION_VIEW）
 */
export function FilePreviewHost() {
  const [task, setTask] = useState<PreviewTask | null>(null)
  const [textResult, setTextResult] = useState<TextResult | null>(null)
  const [openError, setOpenError] = useState<OpenError | null>(null)
  const insets = useSafeAreaInsets()

  useEffect(() => previewQueue.subscribe(setTask), [])

  const kind = task ? previewKind(task.mimeType, task.name) : 'other'

  // 结果按 uri 判定新旧：换文件时派生结果自然失效，effect 里就不需要先 setState 清空。
  const text = textResult && task?.uri === textResult.uri ? textResult : null
  const externalError = openError && task?.uri === openError.uri ? openError.message : null
  const loading = kind === 'text' && text === null

  useEffect(() => {
    if (!task || previewKind(task.mimeType, task.name) !== 'text') {
      return
    }

    const { uri } = task
    let cancelled = false

    ;(async () => {
      try {
        const content = await readTextPreview(new File(uri))
        if (!cancelled) {
          setTextResult({ uri, content, error: null })
        }
      } catch {
        if (!cancelled) {
          setTextResult({ uri, content: null, error: '无法读取该文本文件' })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [task])

  const close = () => {
    previewQueue.resolve({ action: 'closed', uri: task?.uri ?? '' })
  }

  const openExternal = async () => {
    if (!task) {
      return
    }

    setOpenError(null)
    try {
      const file = new File(task.uri)
      const canPreview = await file.canPreview({ mimeType: task.mimeType }).catch(() => false)

      if (canPreview) {
        await file.preview({ title: task.name, mimeType: task.mimeType })
      } else {
        await Sharing.shareAsync(task.uri, {
          mimeType: task.mimeType,
          dialogTitle: task.name,
          UTI: undefined,
        })
      }

      previewQueue.resolve({ action: 'opened-external', uri: task.uri })
    } catch (error: unknown) {
      setOpenError({ uri: task.uri, message: error instanceof Error ? error.message : '无法打开该文件' })
    }
  }

  return (
    <Modal
      visible={Boolean(task)}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭预览"
            onPress={close}
            style={styles.closeButton}
          >
            <Ionicons
              name="close"
              size={20}
              color={colors.text}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text
              style={styles.title}
              numberOfLines={1}
            >
              {task?.name ?? ''}
            </Text>
            <Text
              style={styles.meta}
              numberOfLines={1}
            >
              {[formatBytes(task?.size), task?.mimeType].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        <View style={[styles.body, kind === 'image' && styles.bodyImage]}>
          {kind === 'image' && task ? (
            <Image
              source={{ uri: task.uri }}
              style={styles.image}
              contentFit="contain"
              transition={150}
            />
          ) : null}

          {kind === 'text' ? (
            loading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <ScrollView contentContainerStyle={styles.textContent}>
                <Text
                  style={styles.code}
                  selectable
                >
                  {text?.content ?? text?.error ?? ''}
                </Text>
              </ScrollView>
            )
          ) : null}

          {kind === 'other' ? (
            <View style={styles.placeholder}>
              <View style={styles.placeholderIcon}>
                <Ionicons
                  name="document-outline"
                  size={28}
                  color={colors.accent}
                />
              </View>
              <Text style={styles.placeholderTitle}>该类型不支持内置预览</Text>
              <Text style={styles.placeholderText}>
                点击下方按钮交给系统打开（iOS Quick Look / Android ACTION_VIEW）。
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {externalError ? <Text style={styles.hint}>{externalError}</Text> : null}
          <Button
            label="用其他应用打开"
            variant="ghost"
            icon="open-outline"
            onPress={openExternal}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: 11,
    color: colors.subtext,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  bodyImage: {
    backgroundColor: '#0B1020',
    padding: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContent: {
    padding: spacing.md,
  },
  code: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    lineHeight: 18,
    color: '#374151',
  },
  placeholder: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  placeholderIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.accentWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  placeholderText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.subtext,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  hint: {
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
  },
})
