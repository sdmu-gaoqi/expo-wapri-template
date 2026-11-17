import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Button, Card, CodeBlock, Screen, Section } from '@/components/ui'
import { previewQueue } from '@/jsbridge/interactions'
import { ensureLocalFile, formatBytes, pickDocument } from '@/jsbridge/media'
import { BridgeError } from '@/jsbridge/protocol'
import { colors, fonts, radius, spacing } from '@/theme'

interface Sample {
  key: string
  label: string
  description: string
  url: string
  name: string
  mimeType: string
  icon: keyof typeof Ionicons.glyphMap
}

const SAMPLES: Sample[] = [
  {
    key: 'image',
    label: '远程图片',
    description: '下载到缓存后用内置查看器打开',
    url: 'https://picsum.photos/seed/wapri/1200/800',
    name: 'sample.jpg',
    mimeType: 'image/jpeg',
    icon: 'image-outline',
  },
  {
    key: 'text',
    label: '远程文本',
    description: 'Markdown 直接读取源码展示',
    url: 'https://raw.githubusercontent.com/sdmu-gaoqi/wapri/main/README.md',
    name: 'README.md',
    mimeType: 'text/markdown',
    icon: 'document-text-outline',
  },
]

export default function FilePreviewScreen() {
  const [status, setStatus] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const previewSample = async (sample: Sample) => {
    setBusyKey(sample.key)
    setStatus('下载中…')

    try {
      const file = await ensureLocalFile(sample.url, sample.name)
      setStatus(null)

      const result = await previewQueue.ask({
        uri: file.uri,
        name: sample.name,
        mimeType: sample.mimeType,
        size: file.size,
      })

      setStatus(result.action === 'closed' ? `已关闭预览 · ${file.name}` : `已交给系统打开 · ${file.name}`)
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : '预览失败')
    } finally {
      setBusyKey(null)
    }
  }

  const previewLocal = async () => {
    setBusyKey('local')
    setStatus(null)

    try {
      const asset = await pickDocument()
      const result = await previewQueue.ask({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
      })

      setStatus(
        `${result.action === 'closed' ? '已关闭预览' : '已交给系统打开'} · ${asset.name}（${formatBytes(asset.size)}）`,
      )
    } catch (error: unknown) {
      if (error instanceof BridgeError && error.code === 4001) {
        setStatus('已取消选择')
      } else {
        setStatus(error instanceof Error ? error.message : '预览失败')
      }
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <Screen>
      <Section
        title="示例文件"
        hint="下载 → 预览"
      >
        <Card>
          {SAMPLES.map((sample, index) => (
            <View
              key={sample.key}
              style={[styles.row, index === SAMPLES.length - 1 && styles.rowLast]}
            >
              <View style={styles.rowIcon}>
                <Ionicons
                  name={sample.icon}
                  size={19}
                  color={colors.accent}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{sample.label}</Text>
                <Text style={styles.rowDesc}>{sample.description}</Text>
              </View>
              <Button
                label="预览"
                variant="secondary"
                loading={busyKey === sample.key}
                onPress={() => previewSample(sample)}
              />
            </View>
          ))}

          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowIcon}>
              <Ionicons
                name="folder-open-outline"
                size={19}
                color={colors.accent}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>本地文件</Text>
              <Text style={styles.rowDesc}>从系统文件选择器挑选任意类型</Text>
            </View>
            <Button
              label="选择"
              variant="ghost"
              loading={busyKey === 'local'}
              onPress={previewLocal}
            />
          </View>
        </Card>

        {status ? (
          <View style={styles.status}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={colors.subtext}
            />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </Section>

      <Section title="预览策略">
        <Card style={styles.policyCard}>
          <View style={styles.policyRow}>
            <Text style={styles.policyTag}>image/*</Text>
            <Text style={styles.policyText}>内置查看器，深色底 + contain 铺满</Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyTag}>text/*</Text>
            <Text style={styles.policyText}>读取源码，20 万字符内直接展示</Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyTag}>其它</Text>
            <Text style={styles.policyText}>
              File.canPreview() 判定后走 Quick Look / ACTION_VIEW，失败再退到系统分享
            </Text>
          </View>
        </Card>
      </Section>

      <Section title="对应桥接方法">
        <CodeBlock>
          jsbridge.previewFile({'{ url: "https://…/a.pdf", name: "a.pdf" }'}){'\n'}
          {'// → { action: "closed" | "opened-external", uri }'}
        </CodeBlock>
      </Section>
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F2F4',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.accentWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.text,
  },
  rowDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.faint,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.subtext,
  },
  policyCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  policyRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  policyTag: {
    width: 68,
    fontSize: 11,
    fontFamily: fonts.mono,
    color: colors.accent,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.subtext,
  },
})
