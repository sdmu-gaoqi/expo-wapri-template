import { Ionicons } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'

import { colors, fonts, radius, spacing } from '@/theme'

export const text = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.4 },
  h2: { fontSize: 17, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, lineHeight: 21, color: colors.text },
  label: { fontSize: 13, fontWeight: '500', color: colors.text },
  caption: { fontSize: 12, lineHeight: 17, color: colors.subtext },
  mono: { fontSize: 11.5, lineHeight: 17, color: colors.codeText, fontFamily: fonts.mono },
})

/* -------------------------------------------------------------------------- */
/* 布局                                                                        */
/* -------------------------------------------------------------------------- */

export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode
  scroll?: boolean
  contentStyle?: StyleProp<ViewStyle>
}) {
  if (!scroll) {
    return <View style={[styles.screen, contentStyle]}>{children}</View>
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {children}
    </ScrollView>
  )
}

export function Section({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>
}

/* -------------------------------------------------------------------------- */
/* 控件                                                                        */
/* -------------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  icon?: keyof typeof Ionicons.glyphMap
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const palette = BUTTON_PALETTE[variant]
  const inactive = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive) }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && styles.buttonPressed,
        inactive && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={palette.text}
        />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={palette.text}
        />
      ) : null}
      <Text style={[styles.buttonLabel, { color: palette.text }]}>{label}</Text>
    </Pressable>
  )
}

const BUTTON_PALETTE: Record<ButtonVariant, { background: string; border: string; text: string }> = {
  primary: { background: colors.accent, border: colors.accent, text: colors.white },
  secondary: { background: colors.accentWeak, border: colors.accentWeak, text: colors.accent },
  ghost: { background: colors.card, border: colors.border, text: colors.text },
  danger: { background: colors.dangerWeak, border: '#FBD5D5', text: colors.danger },
}

export function Input({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.faint}
      {...props}
      style={[styles.input, style]}
    />
  )
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string
  tone?: 'neutral' | 'success' | 'danger' | 'accent'
}) {
  return (
    <View style={[styles.badge, { backgroundColor: BADGE_PALETTE[tone].background }]}>
      <Text style={[styles.badgeLabel, { color: BADGE_PALETTE[tone].text }]}>{label}</Text>
    </View>
  )
}

const BADGE_PALETTE = {
  neutral: { background: '#F3F4F6', text: colors.subtext },
  success: { background: colors.successWeak, text: colors.success },
  danger: { background: colors.dangerWeak, text: colors.danger },
  accent: { background: colors.accentWeak, text: colors.accent },
} as const

export function CodeBlock({
  children,
  tone = 'light',
  numberOfLines,
}: {
  children: ReactNode
  tone?: 'light' | 'dark'
  numberOfLines?: number
}) {
  const isDark = tone === 'dark'

  return (
    <View style={[styles.code, isDark && styles.codeDark]}>
      <Text
        numberOfLines={numberOfLines}
        style={[text.mono, isDark ? styles.codeTextDark : styles.codeTextLight]}
      >
        {children}
      </Text>
    </View>
  )
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.keyValue}>
      <Text style={styles.keyValueLabel}>{label}</Text>
      <Text
        style={styles.keyValueValue}
        selectable
      >
        {value}
      </Text>
    </View>
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
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.subtext,
    letterSpacing: 0.4,
  },
  sectionHint: {
    fontSize: 11,
    color: colors.faint,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  button: {
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  input: {
    height: 42,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: '#F9FAFB',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 13.5,
    color: colors.text,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  code: {
    backgroundColor: '#F8F9FB',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  codeDark: {
    backgroundColor: colors.code,
  },
  codeTextLight: {
    color: '#374151',
  },
  codeTextDark: {
    color: colors.codeText,
  },
  keyValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 5,
  },
  keyValueLabel: {
    fontSize: 12,
    color: colors.subtext,
    width: 92,
  },
  keyValueValue: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    textAlign: 'right',
    fontFamily: fonts.mono,
  },
})
