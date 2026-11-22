import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { DISPLAY_FONT_SEMI, space, useColors, useFontFamily } from '@/utils/theme';

export interface SettingsSectionProps {
  /** Heading above the group. */
  title: string;
  /** Optional note under the group, for context that applies to all of its rows. */
  footer?: string;
  /** `SettingsRow` elements. Falsy children are skipped, so rows can be conditional. */
  children: ReactNode;
}

/** A titled card of `SettingsRow`s with hairlines between rows. */
export function SettingsSection({ title, footer, children }: SettingsSectionProps) {
  const c = useColors(),
    fonts = useFontFamily();
  const rows = Children.toArray(children);
  return (
    <View style={{ marginBottom: space.xl }}>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: DISPLAY_FONT_SEMI,
          color: c.onSurface,
          fontSize: 18,
          lineHeight: 24,
          paddingHorizontal: space.xs,
          marginBottom: space.sm,
        }}>
        {title}
      </Text>
      <Card padded={false}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: c.outlineVariant,
                  marginLeft: space.lg,
                }}
              />
            )}
            {row}
          </Fragment>
        ))}
      </Card>
      {!!footer && (
        <Text
          style={{
            fontFamily: fonts.regular,
            color: c.onSurfaceVariant,
            fontSize: 12,
            lineHeight: 18,
            paddingHorizontal: space.xs,
            marginTop: space.sm,
          }}>
          {footer}
        </Text>
      )}
    </View>
  );
}
