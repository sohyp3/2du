import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Markdown from 'react-native-markdown-display';
import { useNoteStore } from '@/store/noteStore';
import { useColors, useFontFamily } from '@/utils/theme';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const fonts = useFontFamily();

  const notes = useNoteStore((s) => s.notes);
  const updateNote = useNoteStore((s) => s.updateNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const togglePin = useNoteStore((s) => s.togglePin);

  const note = notes.find((n) => n.id === id);

  const isNew = useMemo(() => note?.title === 'Untitled' && !note?.content, []);
  const [title, setTitle] = useState(isNew ? '' : (note?.title ?? ''));
  const [content, setContent] = useState(note?.content ?? '');
  const [editing, setEditing] = useState(!note?.content);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<TextInput>(null);

  // Auto-save with debounce
  const save = useCallback(
    (t: string, c: string) => {
      if (!id) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateNote(id, { title: t || 'Untitled', content: c });
      }, 500);
    },
    [id, updateNote]
  );

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (id) updateNote(id, { title: title || 'Untitled', content });
    };
  }, [id, title, content, updateNote]);

  const handleTitleChange = useCallback(
    (t: string) => {
      setTitle(t);
      save(t, content);
    },
    [content, save]
  );

  const handleContentChange = useCallback(
    (c: string) => {
      setContent(c);
      save(title, c);
    },
    [title, save]
  );

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          deleteNote(id!);
          router.back();
        },
      },
    ]);
  }, [id, deleteNote, router]);

  const markdownStyles = {
    body: { color: c.onSurface, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
    heading1: { color: c.onSurface, fontFamily: fonts.bold, fontSize: 24, marginVertical: 8 },
    heading2: { color: c.onSurface, fontFamily: fonts.bold, fontSize: 20, marginVertical: 6 },
    heading3: { color: c.onSurface, fontFamily: fonts.medium, fontSize: 17, marginVertical: 4 },
    link: { color: c.primary },
    blockquote: {
      borderLeftColor: c.primary,
      borderLeftWidth: 3,
      paddingLeft: 12,
      backgroundColor: c.surfaceContainerLow,
      borderRadius: 4,
    },
    code_inline: {
      backgroundColor: c.surfaceContainerHigh,
      color: c.onSurface,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
      paddingHorizontal: 4,
      borderRadius: 3,
    },
    fence: {
      backgroundColor: c.surfaceContainerHigh,
      color: c.onSurface,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
      padding: 12,
      borderRadius: 8,
    },
    bullet_list_icon: { color: c.primary },
    ordered_list_icon: { color: c.primary },
    hr: { backgroundColor: c.outlineVariant },
    strong: { fontFamily: fonts.bold },
    em: { fontStyle: 'italic' as const },
  };

  if (!note) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant }}>Note not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Toolbar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 4,
            gap: 12,
          }}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={c.onSurfaceVariant} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => togglePin(id!)}>
            <Ionicons
              name={note.pinned ? 'pin' : 'pin-outline'}
              size={22}
              color={note.pinned ? c.primary : c.onSurfaceVariant}
            />
          </Pressable>
          <Pressable onPress={() => setEditing((e) => !e)}>
            <Ionicons
              name={editing ? 'eye-outline' : 'create-outline'}
              size={22}
              color={c.onSurfaceVariant}
            />
          </Pressable>
          <Pressable onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={c.error} />
          </Pressable>
        </View>

        {/* Title */}
        <TextInput
          ref={titleRef}
          value={title}
          onChangeText={handleTitleChange}
          autoFocus={isNew}
          placeholder="Title"
          placeholderTextColor={c.outline}
          style={{
            fontFamily: fonts.bold,
            fontSize: 24,
            color: c.onSurface,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        />

        {/* Content */}
        {editing ? (
          <TextInput
            value={content}
            onChangeText={handleContentChange}
            placeholder="Start writing... (supports markdown)"
            placeholderTextColor={c.outline}
            multiline
            textAlignVertical="top"
            style={{
              flex: 1,
              fontFamily: fonts.regular,
              fontSize: 15,
              color: c.onSurface,
              paddingHorizontal: 16,
              paddingTop: 8,
              lineHeight: 22,
            }}
          />
        ) : (
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 16 }}
            contentContainerStyle={{ paddingBottom: 32 }}>
            {content ? (
              <Markdown style={markdownStyles}>{content}</Markdown>
            ) : (
              <Text style={{ fontFamily: fonts.regular, color: c.outline, fontStyle: 'italic' }}>
                Empty note — tap the edit icon to start writing
              </Text>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
