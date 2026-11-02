import { PressFeedback as Pressable } from './PressFeedback';
import { useState, useCallback, useMemo, useRef } from 'react';
import { TextInput, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTodoStore } from '@/store/todoStore';
import { useColors, useFontFamily } from '@/utils/theme';

function getDefaultTimeMinutes(): number {
  const d = new Date();
  let total = d.getHours() * 60 + d.getMinutes() + 60;
  total = Math.ceil(total / 30) * 30;
  return total % (24 * 60);
}

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

  return (
    <View style={{ backgroundColor: c.surfaceContainer }} className="rounded-xl p-1.5">
      <View className="flex-row items-center gap-2">
        <TextInput
          ref={inputRef}
          style={{
            fontFamily: fonts.regular,
            backgroundColor: c.surfaceContainerHigh,
            color: c.onSurface,
            minWidth: 0,
            minHeight: 42,
            lineHeight: 20,
          }}
          placeholderTextColor={c.outline}
          className="flex-1 rounded-md px-3 text-sm"
          placeholder="What’s the next small step?"
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          multiline={false}
          blurOnSubmit={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add task"
          onPress={handleSubmit}
          onLongPress={() => {
            const trimmed = name.trim();
            router.push({ pathname: '/add-todo', params: trimmed ? { name: trimmed } : {} });
            setName('');
          }}
          style={{ backgroundColor: c.primary, minHeight: 42, justifyContent: 'center' }}
          className="rounded-md px-4">
          <Text style={{ fontFamily: fonts.bold, color: c.onPrimary }} className="text-sm">
            Add
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
