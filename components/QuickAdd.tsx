import { PressFeedback as Pressable } from './PressFeedback';
import { useState, useCallback, useMemo, useRef } from 'react';
import { TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTodoStore } from '@/store/todoStore';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';

function getDefaultTimeMinutes(): number {
  const d = new Date();
  let total = d.getHours() * 60 + d.getMinutes() + 60;
  total = Math.ceil(total / 30) * 30;
  return total % (24 * 60);
}

/** One field with the add button inside it. Long-press the button for the full form. */
export function QuickAdd() {
  const [name, setName] = useState('');
  const [timeMinutes] = useState(getDefaultTimeMinutes);
  const c = useColors();
  const fonts = useFontFamily();

  const addTodo = useTodoStore((s) => s.addTodo);
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const datetime = useMemo(() => {
    const d = new Date();
    d.setHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);
    return d.toISOString();
  }, [timeMinutes]);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      router.push('/add-todo');
      return;
    }
    const date = new Date(useTodoStore.getState().referenceDate);
    const time = new Date(datetime);
    date.setHours(time.getHours(), time.getMinutes(), 0, 0);
    await addTodo({ name: trimmed, datetime: date.toISOString() });
    if (useTodoStore.getState().error) return;
    setName('');
    inputRef.current?.focus();
  }, [name, datetime, addTodo, router]);

  const hasText = name.trim().length > 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surfaceContainer,
        borderRadius: radius.lg,
        paddingLeft: space.lg,
        paddingRight: space.xs,
        minHeight: 52,
      }}>
      <TextInput
        ref={inputRef}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 48,
          fontFamily: fonts.regular,
          color: c.onSurface,
          ...type.body,
        }}
        placeholderTextColor={c.outline}
        placeholder="Add a task"
        value={name}
        onChangeText={setName}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        multiline={false}
        submitBehavior="submit"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasText ? 'Add task' : 'New task with details'}
        accessibilityHint="Long press to open the full form"
        onPress={handleSubmit}
        onLongPress={() => {
          const trimmed = name.trim();
          router.push({ pathname: '/add-todo', params: trimmed ? { name: trimmed } : {} });
          setName('');
        }}
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: hasText ? c.primary : 'transparent',
        }}>
        <Ionicons
          name={hasText ? 'arrow-up' : 'add'}
          size={22}
          color={hasText ? c.onPrimary : c.onSurfaceVariant}
        />
      </Pressable>
    </View>
  );
}
