import { createContext, useContext, type ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space, useColors } from '@/utils/theme';

export type CardTone = 'plain' | 'soft' | 'accent';

const CardInk = createContext<string | undefined>(undefined);

/** The text colour a card's content should use, or undefined outside an accent card. */
export function useCardInk() {
  return useContext(CardInk);
}

/** A rounded surface. `plain` is raised with a soft tinted shadow, `soft` is a flat tonal fill,
 * `accent` is the primary colour and hands `onPrimary` down through `useCardInk()`. */
export function Card({
  children,
  tone = 'plain',
  style,
  padded = true,
}: {
  children: ReactNode;
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const c = useColors();
  const raised: ViewStyle =
    tone === 'plain'
      ? Platform.select<ViewStyle>({
          web: { boxShadow: `0 6px 20px ${c.shadow}` },
          android: { elevation: 2, shadowColor: c.shadow },
          default: {
            shadowColor: c.shadow,
            shadowOpacity: 1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
          },
        })
      : {};
  return (
    <CardInk.Provider value={tone === 'accent' ? c.onPrimary : undefined}>
      <View
        style={[
          {
            borderRadius: radius.lg,
            padding: padded ? space.lg : 0,
            backgroundColor:
              tone === 'accent'
                ? c.primary
                : tone === 'soft'
                  ? c.surfaceContainer
                  : c.surfaceContainerLow,
          },
          raised,
          style,
        ]}>
        {children}
      </View>
    </CardInk.Provider>
  );
}
