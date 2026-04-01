import { useEffect, useState } from 'react';
import { FlatList, Keyboard, Platform, Text, View } from 'react-native';

import { useTodoStore } from '@/store/todoStore';
import { TodoItem } from '@/components/TodoItem';
import { QuickAdd } from '@/components/QuickAdd';
import { TimeFilter } from '@/components/TimeFilter';
import { Todo } from '@/db/todos';

const keyExtractor = (item: Todo) => item.id;
const renderItem = ({ item }: { item: Todo }) => <TodoItem todo={item} />;

export default function TodosScreen() {
  const todos = useTodoStore((s) => s.todos);
  const loadTodos = useTodoStore((s) => s.loadTodos);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardOffset(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <View className="flex-1 bg-primary-50">
      <View className="flex-1 px-4 pt-12">
        <TimeFilter />

        <FlatList
          data={todos}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 16 }}
          ListEmptyComponent={
            <View className="items-center pt-20">
              <Text className="text-base text-gray-400">No todos for this period</Text>
            </View>
          }
        />
      </View>

      <View
        style={{ marginBottom: keyboardOffset > 0 ? keyboardOffset - 80 : 0 }}
        className="px-4 pb-2">
        <QuickAdd />
      </View>
    </View>
  );
}
