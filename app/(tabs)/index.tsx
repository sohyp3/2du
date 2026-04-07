import { useEffect } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { useTodoStore } from '@/store/todoStore';
import { TodoItem } from '@/components/TodoItem';
import { QuickAdd } from '@/components/QuickAdd';
import { TimeFilter } from '@/components/TimeFilter';
import { Todo } from '@/db/todos';
import { useColors, useFontFamily } from '@/utils/theme';

const keyExtractor = (item: Todo) => item.id;

export default function TodosScreen() {
  const todos = useTodoStore((s) => s.todos);
  const loadTodos = useTodoStore((s) => s.loadTodos);
  const c = useColors();
  const fonts = useFontFamily();

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const renderItem = ({ item }: { item: Todo }) => <TodoItem todo={item} />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
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
              <Text style={{ fontFamily: fonts.regular, color: c.outline }} className="text-base">
                No todos for this period
              </Text>
            </View>
          }
        />
      </View>

      <View className="px-4 pb-2">
        <QuickAdd />
      </View>
    </KeyboardAvoidingView>
  );
}
