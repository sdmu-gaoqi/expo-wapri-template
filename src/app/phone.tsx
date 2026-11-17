import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'

import { Button, Card, CodeBlock, Input, Screen, Section } from '@/components/ui'
import { colors, fonts, radius, spacing } from '@/theme'

const QUICK_NUMBERS = ['10086', '95588', '12306']

export default function PhoneScreen() {
  const [phoneNumber, setPhoneNumber] = useState('10086')
  const [status, setStatus] = useState<string | null>(null)

  const call = async () => {
    const digits = phoneNumber.replace(/[^\d+*#]/g, '')

    if (!digits) {
      setStatus('请输入有效号码')
      return
    }

    try {
      await Linking.openURL(`tel:${digits}`)
      setStatus(`已交给系统拨号：${digits}`)
    } catch {
      setStatus('当前设备无法发起拨号（模拟器通常不支持）')
    }
  }

  return (
    <Screen>
      <Section
        title="拨号"
        hint="Linking.openURL('tel:…')"
      >
        <Card style={styles.card}>
          <Text style={styles.label}>电话号码</Text>
          <Input
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder="请输入号码"
            style={styles.input}
          />

          <View style={styles.quickRow}>
            {QUICK_NUMBERS.map((number) => (
              <Pressable
                key={number}
                onPress={() => setPhoneNumber(number)}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              >
                <Text style={styles.chipText}>{number}</Text>
              </Pressable>
            ))}
          </View>

          <Button
            label="拨打"
            icon="call"
            onPress={call}
          />

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
        </Card>
      </Section>

      <Section title="说明">
        <Card style={styles.noteCard}>
          <View style={styles.noteRow}>
            <Text style={styles.noteIndex}>01</Text>
            <Text style={styles.noteText}>
              tel: 由系统接管：Android 直接进入拨号盘，iOS 会弹确认框；iOS 模拟器没有电话 App， 会调用失败。
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.noteRow}>
            <Text style={styles.noteIndex}>02</Text>
            <Text style={styles.noteText}>容器不会申请 CALL_PHONE 权限，只跳到拨号盘，用户仍需自己按下拨出键。</Text>
          </View>
        </Card>
      </Section>

      <Section title="对应桥接方法">
        <CodeBlock>
          jsbridge.makePhoneCall({'{ phoneNumber: "10086" }'}){'\n'}
          {'// → undefined'}
        </CodeBlock>
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
    fontSize: 18,
    fontFamily: fonts.mono,
    height: 48,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.accentWeak,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: 12,
    color: colors.accent,
    fontFamily: fonts.mono,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 17,
  },
  noteCard: {
    paddingHorizontal: spacing.lg,
  },
  noteRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  noteIndex: {
    fontSize: 11,
    color: colors.faint,
    fontFamily: fonts.mono,
    paddingTop: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.subtext,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
})
