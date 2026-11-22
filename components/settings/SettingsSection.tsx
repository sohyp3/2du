import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { space, useColors, useFontFamily } from '@/utils/theme';

export interface SettingsSectionProps {
  /** Small label above the group. */
  title: string;
  /** Optional note under the group, for context that applies to all of its rows. */
  footer?: string;
  /** `SettingsRow` elements. Falsy children are skipped, so rows can be conditional. */
  children: ReactNode;
}

/** A titled, rounded group of `SettingsRow`s with hairlines between rows. */
export function SettingsSection({ title, footer, children }: SettingsSectionProps) {
  const c = useColors(),
    fonts = useFontFamily();
  const rows = Children.toArray(children);
  return (
    <View style={{ marginBottom: space.xl }}>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: fonts.medium,
          color: c.onSurfaceVariant,
          fontSize: 13,
          lineHeight: 18,
          paddingHorizontal: space.lg,
          marginBottom: space.sm,
        }}>
        {title}
      </Text>
      <View style={{ backgroundColor: c.surfaceContainer, borderRadius: 16, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: c.surfaceContainerHighest,
                  marginLeft: space.lg,
                }}
              />
            )}
            {row}
          </Fragment>
        ))}
      </View>
      {!!footer && (
        <Text
          style={{
            fontFamily: fonts.regular,
            color: c.onSurfaceVariant,
            fontSize: 12,
            lineHeight: 18,
            paddingHorizontal: space.lg,
            marginTop: space.sm,
          }}>
          {footer}
        </Text>
      )}
    </View>
  );
}
