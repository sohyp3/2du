import { useState, useCallback, useMemo, useRef } from 'react';
import { TextInput, Pressable, View, Text } from 'react-native';
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

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      router.push('/add-todo');
      return;
    }
    addTodo({ name: trimmed, datetime });
    setName('');
    inputRef.current?.focus();
  }, [name, datetime, addTodo, router]);

  return (
    <View style={{ backgroundColor: c.surfaceContainer }} className="rounded-md p-3">
      <View className="flex-row items-center gap-2">
        <TextInput
          ref={inputRef}
          style={{
            fontFamily: fonts.regular,
            backgroundColor: c.surfaceContainerHigh,
            color: c.onSurface,
            height: 40,
            lineHeight: 20,
          }}
          placeholderTextColor={c.outline}
          className="flex-1 rounded-md px-3 text-base"
          placeholder="Add todo..."
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          multiline={false}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={handleSubmit}
          onLongPress={() => {
            const trimmed = name.trim();
            router.push({ pathname: '/add-todo', params: trimmed ? { name: trimmed } : {} });
            setName('');
          }}
          style={{ backgroundColor: c.primary, height: 40, justifyContent: 'center' }}
          className="rounded-md px-4">
          <Text style={{ fontFamily: fonts.bold, color: c.onPrimary }} className="text-sm">
            Add
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
