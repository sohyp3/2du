import { useEffect, useCallback } from 'react';
import { FlatList, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNoteStore } from '@/store/noteStore';
import { Note } from '@/db/notes';
import { useColors, useFontFamily } from '@/utils/theme';

const keyExtractor = (item: Note) => item.id;

export default function NotesScreen() {
  const notes = useNoteStore((s) => s.notes);
  const isLoading = useNoteStore((s) => s.isLoading);
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const addNote = useNoteStore((s) => s.addNote);
  const c = useColors();
  const fonts = useFontFamily();
  const router = useRouter();

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAdd = useCallback(async () => {
    const id = await addNote('Untitled');
    router.push(`/note/${id}`);
  }, [addNote, router]);

  const renderItem = useCallback(
    ({ item }: { item: Note }) => {
      const preview = item.content.slice(0, 100).replace(/[#*_~`>\-\[\]]/g, '') || 'Empty note';
      return (
        <Pressable
          onPress={() => router.push(`/note/${item.id}`)}
          style={{
            backgroundColor: c.surfaceContainer,
            borderRadius: 12,
            padding: 16,
            marginBottom: 10,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            {item.pinned && (
              <Ionicons name="pin" size={14} color={c.primary} style={{ marginRight: 6 }} />
            )}
            <Text
              numberOfLines={1}
              style={{ fontFamily: fonts.medium, color: c.onSurface, fontSize: 16, flex: 1 }}>
              {item.title}
            </Text>
          </View>
          <Text
            numberOfLines={2}
            style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13 }}>
            {preview}
          </Text>
        </Pressable>
      );
    },
    [c, fonts, router]
  );

  if (isLoading && notes.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.surface, paddingHorizontal: 16, paddingTop: 48 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
        <Text style={{ fontFamily: fonts.bold, color: c.onSurface, fontSize: 28 }}>Notes</Text>
        <Pressable
          onPress={handleAdd}
          style={{
            backgroundColor: c.primary,
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="add" size={24} color={c.onPrimary} />
        </Pressable>
      </View>

      <FlatList
        data={notes}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Ionicons name="document-text-outline" size={48} color={c.outline} />
            <Text
              style={{ fontFamily: fonts.regular, color: c.outline, fontSize: 16, marginTop: 12 }}>
              No notes yet
            </Text>
          </View>
        }
      />
    </View>
  );
}
