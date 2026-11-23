import type { ComponentType } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { useSyncStore } from '@/store/syncStore';
import type { ThemeColors } from '@/store/themeStore';
import { SWATCHES } from '@/utils/palette';
import { AccountSettings } from './AccountSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { BookingSettings } from './BookingSettings';
import { BriefSettings } from './BriefSettings';
import { CalendarsSection } from './CalendarsSection';
import { DataSettings } from './DataSettings';
import { GoalsSettings } from './GoalsSettings';
import { KeysSettings } from './KeysSettings';
import { SettingsRow } from './SettingsRow';

export type SectionKey =
  | 'account'
  | 'appearance'
  | 'calendars'
  | 'goals'
  | 'brief'
  | 'booking'
  | 'keys'
  | 'data';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** The badge colour: a swatch hex, or `'outline'` for the theme's neutral grey. */
export type SectionColor = (typeof SWATCHES)[number] | 'outline';

export interface Section {
  key: SectionKey;
  label: string;
  hint: string;
  icon: IoniconName;
  color: SectionColor;
  Component: ComponentType;
}

/** Shown in place of a section that needs an account while signed out. */
function SignInRow() {
  const router = useRouter();
  return (
    <Card padded={false}>
      <SettingsRow
        label="This needs a 2du account"
        right={
          <Chip
            selected
            label="Sign in to use this"
            onPress={() => router.setParams({ section: 'account' })}
          />
        }
      />
    </Card>
  );
}

function needsAccount(Inner: ComponentType): ComponentType {
  function Gated() {
    const connected = useSyncStore((s) => !!s.token);
    return connected ? <Inner /> : <SignInRow />;
  }
  return Gated;
}

export const SECTIONS: Section[] = [
  {
    key: 'account',
    label: 'Account & sync',
    hint: 'Sign-in, server and sync status',
    icon: 'person-circle',
    color: SWATCHES[0],
    Component: AccountSettings,
  },
  {
    key: 'appearance',
    label: 'Appearance',
    hint: 'Light or dark, accent and screen options',
    icon: 'color-palette',
    color: SWATCHES[5],
    Component: AppearanceSettings,
  },
  {
    key: 'calendars',
    label: 'Calendars',
    hint: 'Your calendars, time format and day view',
    icon: 'calendar',
    color: SWATCHES[4],
    Component: CalendarsSection,
  },
  {
    key: 'goals',
    label: 'Goals',
    hint: 'Goal categories',
    icon: 'flag',
    color: SWATCHES[9],
    Component: GoalsSettings,
  },
  {
    key: 'brief',
    label: 'Daily brief',
    hint: 'A morning summary of your day',
    icon: 'newspaper',
    color: SWATCHES[2],
    Component: needsAccount(BriefSettings),
  },
  {
    key: 'booking',
    label: 'Booking links',
    hint: 'Let people book your free time',
    icon: 'link',
    color: SWATCHES[6],
    Component: needsAccount(BookingSettings),
  },
  {
    key: 'keys',
    label: 'Agents & keys',
    hint: 'API keys for agents and scripts',
    icon: 'key',
    color: SWATCHES[1],
    Component: needsAccount(KeysSettings),
  },
  {
    key: 'data',
    label: 'Data',
    hint: 'Export and import a backup',
    icon: 'server',
    color: 'outline',
    Component: DataSettings,
  },
];

export function findSection(key: string | undefined): Section | undefined {
  return SECTIONS.find((s) => s.key === key);
}

/** The hex fill for a section's icon badge. */
export function sectionColor(section: Section, c: ThemeColors): string {
  return section.color === 'outline' ? c.outline : section.color;
}
