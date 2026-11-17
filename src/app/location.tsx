import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useState } from 'react'
import { Linking, Platform, StyleSheet, Text, View } from 'react-native'

import { Button, Card, CodeBlock, KeyValue, Screen, Section } from '@/components/ui'
import { colors, spacing } from '@/theme'

export default function LocationScreen() {
  const [permission, requestPermission] = Location.useForegroundPermissions()
  const [position, setPosition] = useState<Location.LocationObject | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locate = async () => {
    setError(null)
    setLoading(true)

    try {
      let current = permission
      if (!current?.granted) {
        current = await requestPermission()
      }

      if (!current.granted) {
        setError('定位权限未授予')
        return
      }

      const next = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }).catch(async (locationError: unknown) => {
        const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null)
        if (lastKnown) {
          return lastKnown
        }
        throw locationError
      })

      setPosition(next)

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: next.coords.latitude,
          longitude: next.coords.longitude,
        })
        setAddress(formatPlace(place))
      } catch {
        setAddress(null)
      }
    } catch (locationError: unknown) {
      setError(locationError instanceof Error ? locationError.message : '定位失败')
    } finally {
      setLoading(false)
    }
  }

  const openInMap = () => {
    if (!position) {
      return
    }

    const { latitude, longitude } = position.coords
    const label = encodeURIComponent(address ?? '当前位置')
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`

    Linking.openURL(url).catch(() => setError('无法打开地图应用'))
  }

  const coords = position?.coords

  return (
    <Screen>
      <Section
        title="定位"
        hint="expo-location"
      >
        <Card style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.statusDotGroup}>
              <Ionicons
                name={permission?.granted ? 'checkmark-circle' : 'alert-circle-outline'}
                size={16}
                color={permission?.granted ? colors.success : colors.warning}
              />
              <Text style={styles.statusText}>
                {permission?.granted ? '前台定位权限已授予' : '尚未获得前台定位权限'}
              </Text>
            </View>
          </View>

          <Button
            label={position ? '重新获取' : '获取当前位置'}
            icon="navigate"
            onPress={locate}
            loading={loading}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {coords ? (
            <View style={styles.result}>
              <KeyValue
                label="纬度"
                value={coords.latitude.toFixed(6)}
              />
              <KeyValue
                label="经度"
                value={coords.longitude.toFixed(6)}
              />
              <KeyValue
                label="精度"
                value={coords.accuracy ? `${Math.round(coords.accuracy)} m` : '未知'}
              />
              <KeyValue
                label="海拔"
                value={coords.altitude ? `${coords.altitude.toFixed(1)} m` : '未知'}
              />
              <KeyValue
                label="地址"
                value={address ?? '逆地理编码不可用'}
              />
              <KeyValue
                label="时间"
                value={position ? new Date(position.timestamp).toLocaleString() : ''}
              />

              <Button
                label="在地图中打开"
                variant="secondary"
                icon="map-outline"
                onPress={openInMap}
                style={styles.mapButton}
              />
            </View>
          ) : null}
        </Card>
      </Section>

      <Section title="说明">
        <Card style={styles.noteCard}>
          <Text style={styles.noteText}>
            容器只申请前台定位权限；H5 侧通过 jsbridge.getLocation() 拿到同一份坐标。 逆地理编码依赖系统服务，在国内
            Android 设备上可能返回空值。
          </Text>
        </Card>
      </Section>

      <Section title="对应桥接方法">
        <CodeBlock>
          jsbridge.getLocation(){'\n'}
          {'// → { latitude, longitude, accuracy, altitude, address, timestamp }'}
        </CodeBlock>
      </Section>
    </Screen>
  )
}

function formatPlace(place?: Location.LocationGeocodedAddress): string | null {
  if (!place) {
    return null
  }

  const parts = [place.country, place.region, place.city, place.district, place.street, place.name].filter(
    (part): part is string => Boolean(part && part.trim()),
  )

  return Array.from(new Set(parts)).join('') || null
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusDotGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.subtext,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
  },
  result: {
    gap: 2,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  mapButton: {
    marginTop: spacing.sm,
  },
  noteCard: {
    padding: spacing.lg,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.subtext,
  },
})
