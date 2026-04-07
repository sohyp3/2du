import { create } from 'zustand';
import { getCalendarSetting, setCalendarSetting } from '@/db/database';

export type TimeFormat = '12h' | '24h';

export interface CalendarSettings {
  dayViewStartHour: number;
  timeFormat: TimeFormat;
  isLoading: boolean;
  setDayViewStartHour: (hour: number) => Promise<void>;
  setTimeFormat: (format: TimeFormat) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useCalendarStore = create<CalendarSettings>((set) => ({
  dayViewStartHour: 8,
  timeFormat: '12h',
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const savedStartHour = await getCalendarSetting('dayViewStartHour');
      const savedTimeFormat = await getCalendarSetting('timeFormat');

      const updates: Partial<CalendarSettings> = { isLoading: false };

      if (savedStartHour) {
        const hour = parseInt(savedStartHour, 10);
        if (!isNaN(hour) && hour >= 0 && hour <= 23) {
          updates.dayViewStartHour = hour;
        }
      }
      if (savedTimeFormat && (savedTimeFormat === '12h' || savedTimeFormat === '24h')) {
        updates.timeFormat = savedTimeFormat as TimeFormat;
      }

      set(updates);
    } catch (error) {
      console.error('Failed to load calendar settings:', error);
      set({ isLoading: false });
    }
  },

  setDayViewStartHour: async (hour) => {
    const validHour = Math.max(0, Math.min(23, hour));
    set({ dayViewStartHour: validHour });
    try {
      await setCalendarSetting('dayViewStartHour', validHour.toString());
    } catch (error) {
      console.error('Failed to save day view start hour:', error);
    }
  },

  setTimeFormat: async (format) => {
    set({ timeFormat: format });
    try {
      await setCalendarSetting('timeFormat', format);
    } catch (error) {
      console.error('Failed to save time format:', error);
    }
  },
}));
