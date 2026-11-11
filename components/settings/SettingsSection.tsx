import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors, useFontFamily } from '@/utils/theme';

/**
 * Settings spacing scale. Every margin, padding and gap in Settings is one of these values.
 * Rows sit `md` apart from their own content and sections sit `xl` apart.
 */
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

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
    <View style={{ marginBottom: SPACE.xl }}>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: fonts.medium,
          color: c.onSurfaceVariant,
          fontSize: 13,
          lineHeight: 18,
          paddingHorizontal: SPACE.lg,
          marginBottom: SPACE.sm,
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
                  marginLeft: SPACE.lg,
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
            paddingHorizontal: SPACE.lg,
            marginTop: SPACE.sm,
          }}>
          {footer}
        </Text>
      )}
    </View>
  );
}
