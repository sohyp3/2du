import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

/** Placeholder until goal categories land. */
export function GoalsSettings() {
  return (
    <SettingsSection title="Categories">
      <SettingsRow
        label="Categories coming soon"
        hint="Group your goals into coloured categories"
      />
    </SettingsSection>
  );
}
