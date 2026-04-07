import { create } from 'zustand';

export type TimeFormat = '12h' | '24h';

export interface CalendarSettings {
  dayViewStartHour: number;
  timeFormat: TimeFormat;
  setDayViewStartHour: (hour: number) => void;
  setTimeFormat: (format: TimeFormat) => void;
}

export const useCalendarStore = create<CalendarSettings>((set) => ({
  dayViewStartHour: 8,
  timeFormat: '12h',
  setDayViewStartHour: (hour) => set({ dayViewStartHour: hour }),
  setTimeFormat: (format) => set({ timeFormat: format }),
}));
