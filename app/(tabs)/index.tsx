import { useThemeStore } from '@/store/themeStore';
import { useEffect, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTodoStore } from '@/store/todoStore';
import { useNoteStore } from '@/store/noteStore';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useColors, useFontFamily } from '@/utils/theme';
import { TodoItem } from '@/components/TodoItem';
import { QuickAdd } from '@/components/QuickAdd';
import { TimeFilter } from '@/components/TimeFilter';
import { CalendarPicker } from '@/components/CalendarPicker';
import { PressFeedback } from '@/components/PressFeedback';
export default function TasksScreen() {
  const { todos, error, loadTodos } = useTodoStore();
  const { notes, loadNotes } = useNoteStore();
  const selected = useCalendarsStore((s) => s.selected);
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const zen = useThemeStore((s) => s.zenMode);
  const showGreeting = useThemeStore((s) => s.showGreeting);
  const insets = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= 1280;
  useEffect(() => {
    void loadTodos();
    void loadNotes();
  }, [loadTodos, loadNotes]);
  const visible = useMemo(
    () => todos.filter((t) => !selected || (t.calendar_id || 'daily') === selected),
    [todos, selected]
  );
  const completed = visible.filter((t) => t.status === 'completed').length;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          width: '100%',
          maxWidth: 1500,
          alignSelf: 'center',
        }}>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            paddingHorizontal: wide ? 40 : 16,
            paddingTop: Platform.OS === 'web' ? 24 : insets.top + 12,
          }}>
          {showGreeting && (
            <>
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: 'PlayfairDisplay_400Regular',
                  color: c.onSurface,
                  fontSize: wide ? 32 : 26,
                  letterSpacing: -0.5,
                  marginBottom: 4,
                }}>
                Make room for today.
              </Text>
              <Text
                style={{
                  color: c.onSurfaceVariant,
                  fontFamily: fonts.regular,
                  fontSize: 13,
                  lineHeight: 18,
                  marginBottom: 14,
                }}>
                A place for what matters. One thing at a time.
              </Text>
            </>
          )}
          <TimeFilter />
          <CalendarPicker />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
              marginBottom: 2,
            }}>
            <Text style={{ color: c.onSurface, fontFamily: fonts.medium, fontSize: 13 }}>
              Your focus
            </Text>
            <Text style={{ color: c.onSurfaceVariant, fontFamily: fonts.regular, fontSize: 12 }}>
              {completed} of {visible.length} complete
            </Text>
          </View>
          {error && (
            <PressFeedback
              onPress={loadTodos}
              accessibilityRole="button"
              style={{ padding: 12, backgroundColor: c.errorContainer, borderRadius: 8 }}>
              <Text style={{ color: c.onErrorContainer }}>{error} · Retry</Text>
            </PressFeedback>
          )}
          <FlatList
            data={visible}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => <TodoItem todo={item} />}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 12, flexGrow: 1 }}
            ListEmptyComponent={
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Ionicons name="sunny-outline" color={c.primary} size={24} />
                <Text
                  style={{
                    color: c.onSurface,
                    fontFamily: 'PlayfairDisplay_400Regular',
                    fontSize: 18,
                    marginTop: 10,
                  }}>
                  A little breathing room.
                </Text>
                <Text
                  style={{
                    color: c.onSurfaceVariant,
                    fontFamily: fonts.regular,
                    fontSize: 13,
                    marginTop: 6,
                    textAlign: 'center',
                    lineHeight: 19,
                  }}>
                  No tasks in this view. Add something below,{'\n'}or give yourself a moment.
                </Text>
              </View>
            }
          />
          <View style={{ paddingBottom: 10 }}>
            <QuickAdd />
          </View>
        </View>
        {wide && !zen && (
          <View
            style={{
              width: 300,
              paddingHorizontal: 24,
              paddingTop: 24,
              borderLeftWidth: 1,
              borderLeftColor: c.outlineVariant,
            }}>
            <Text
              style={{
                fontFamily: 'PlayfairDisplay_400Regular',
                fontSize: 20,
                color: c.onSurface,
              }}>
              On your mind
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                color: c.onSurfaceVariant,
                fontSize: 13,
                lineHeight: 19,
                marginTop: 4,
                marginBottom: 12,
              }}>
              Loose thoughts, ready when you are.
            </Text>
            {notes.slice(0, 4).map((n) => (
              <PressFeedback
                key={n.id}
                accessibilityRole="button"
                onPress={() => router.push(`/note/${n.id}`)}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: c.outlineVariant,
                }}>
                <Text
                  numberOfLines={2}
                  style={{ fontFamily: fonts.medium, color: c.onSurface, fontSize: 14 }}>
                  {n.title}
                </Text>
                <Text
                  numberOfLines={3}
                  style={{
                    fontFamily: fonts.regular,
                    color: c.onSurfaceVariant,
                    fontSize: 13,
                    lineHeight: 19,
                    marginTop: 4,
                  }}>
                  {n.content || 'An idea waiting to happen.'}
                </Text>
              </PressFeedback>
            ))}
            <PressFeedback
              accessibilityRole="button"
              onPress={() => router.navigate('/notes')}
              style={{ minHeight: 48, justifyContent: 'center', marginTop: 16 }}>
              <Text style={{ color: c.primary, fontFamily: fonts.medium, fontSize: 13 }}>
                Open your notebook →
              </Text>
            </PressFeedback>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
