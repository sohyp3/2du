import { useEffect } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
  ActivityIndicator,
  Pressable,
} from 'react-native';

import { useTodoStore } from '@/store/todoStore';
import { TodoItem } from '@/components/TodoItem';
import { QuickAdd } from '@/components/QuickAdd';
import { TimeFilter } from '@/components/TimeFilter';
import { Todo } from '@/db/todos';
import { useColors, useFontFamily } from '@/utils/theme';

const keyExtractor = (item: Todo) => item.id;

export default function TodosScreen() {
  const todos = useTodoStore((s) => s.todos);
  const isLoading = useTodoStore((s) => s.isLoading);
  const error = useTodoStore((s) => s.error);
  const loadTodos = useTodoStore((s) => s.loadTodos);
  const clearError = useTodoStore((s) => s.clearError);
  const c = useColors();
  const fonts = useFontFamily();
  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const renderItem = ({ item }: { item: Todo }) => <TodoItem todo={item} />;

  // Loading state
  if (isLoading && todos.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator color={c.primary} size="large" />
        <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, marginTop: 16 }}>
          Loading todos...
        </Text>
      </View>
    );
  }

  // Error state
  if (error && todos.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
        <Text style={{ fontFamily: fonts.bold, color: c.error, fontSize: 18, marginBottom: 8 }}>
          Error Loading Todos
        </Text>
        <Text
          style={{
            fontFamily: fonts.regular,
            color: c.onSurfaceVariant,
            textAlign: 'center',
            marginBottom: 24,
          }}>
          {error}
        </Text>
        <Pressable
          onPress={() => {
            clearError();
            loadTodos();
          }}
          style={{
            backgroundColor: c.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 20,
          }}>
          <Text style={{ fontFamily: fonts.medium, color: c.onPrimary }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View className="flex-1 px-4 pt-12">
        <TimeFilter />

        {/* Inline loading indicator */}
        {isLoading && todos.length > 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <ActivityIndicator color={c.primary} size="small" />
          </View>
        )}

        {/* Inline error message */}
        {error && todos.length > 0 && (
          <Pressable
            onPress={() => {
              clearError();
              loadTodos();
            }}
            style={{
              backgroundColor: c.errorContainer,
              padding: 12,
              borderRadius: 8,
              marginBottom: 8,
            }}>
            <Text
              style={{ fontFamily: fonts.regular, color: c.onErrorContainer, textAlign: 'center' }}>
              {error} - Tap to retry
            </Text>
          </Pressable>
        )}

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
