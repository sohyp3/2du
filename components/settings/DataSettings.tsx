import { useState } from 'react';
import { ActivityIndicator, Alert, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { exportData, importData, ImportExportError } from '@/db/importExport';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useNoteStore } from '@/store/noteStore';
import { useTodoStore } from '@/store/todoStore';
import { useColors } from '@/utils/theme';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

export function DataSettings() {
  const c = useColors();
  const loadTodos = useTodoStore((s) => s.loadTodos);
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const transferring = isExporting || isImporting;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportData();
    } catch (error) {
      const message = error instanceof ImportExportError ? error.message : 'Failed to export data';
      Alert.alert('Export Failed', message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await importData();
      if (result.success) {
        await loadTodos();
        await loadNotes();
        await useCalendarsStore.getState().load();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Import failed', message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SettingsSection
      title="Backup"
      footer="Export saves everything to a JSON file. Import merges a previous backup without removing other records.">
      <SettingsRow
        label="Export"
        onPress={handleExport}
        disabled={transferring}
        right={
          isExporting ? (
            <ActivityIndicator color={c.primary} size="small" />
          ) : (
            <Ionicons name="download-outline" size={20} color={c.onSurfaceVariant} />
          )
        }
      />
      <SettingsRow
        label="Import"
        onPress={handleImport}
        disabled={transferring}
        right={
          isImporting ? (
            <ActivityIndicator color={c.primary} size="small" />
          ) : (
            <Ionicons name="push-outline" size={20} color={c.onSurfaceVariant} />
          )
        }
      />
    </SettingsSection>
  );
}
