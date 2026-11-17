import { Platform } from 'react-native'

/**
 * 容器模板的浅色主题。
 *
 * 组件与页面统一从这里取色，改主题只需要动这一处。
 */
export const colors = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  text: '#16181D',
  subtext: '#6B7280',
  faint: '#9CA3AF',
  border: '#E5E7EB',
  borderStrong: '#D8DCE2',
  accent: '#2563EB',
  accentWeak: '#EFF4FF',
  accentBorder: '#BFD3FD',
  success: '#15803D',
  successWeak: '#ECFDF3',
  warning: '#B45309',
  warningWeak: '#FFFBEB',
  danger: '#DC2626',
  dangerWeak: '#FEF2F2',
  code: '#0B1020',
  codeText: '#CBD5E1',
  codeMuted: '#94A3B8',
  white: '#FFFFFF',
} as const

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const

export const fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
}
