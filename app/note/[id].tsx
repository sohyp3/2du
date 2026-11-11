import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Markdown from 'react-native-markdown-display';
import { buildMarkdownStyles } from '@/utils/markdownStyles';
import { useNoteStore } from '@/store/noteStore';
import { PressFeedback as Pressable } from '@/components/PressFeedback';
import { useColors, useFontFamily } from '@/utils/theme';

const paper = { surface: '#f1eadc', ink: '#342c20', muted: '#695d49', rule: '#d8cfbd' };

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const fonts = useFontFamily();

  const notes = useNoteStore((s) => s.notes);
  const saveError = useNoteStore((s) => s.error);
  const updateNote = useNoteStore((s) => s.updateNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const togglePin = useNoteStore((s) => s.togglePin);

  const note = notes.find((n) => n.id === id);

  const isNew = note?.title === 'Untitled' && !note?.content;
  const [title, setTitle] = useState(isNew ? '' : (note?.title ?? ''));
  const [content, setContent] = useState(note?.content ?? '');
  const [editing, setEditing] = useState(!note?.content);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<TextInput>(null);
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');

  const draft = useRef({ title, content, dirty: false, deleted: false });
  const flush = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const current = draft.current;
    if (id && current.dirty && !current.deleted) {
      setSaveState('saving');
      await updateNote(id, { title: current.title || 'Untitled', content: current.content });
      if (useNoteStore.getState().error) {
        setSaveState('error');
        return false;
      }
      current.dirty = false;
      setSaveState(draft.current.dirty ? 'dirty' : 'saved');
    }
    return true;
  }, [id, updateNote]);
  const save = useCallback(
    (t: string, body: string) => {
      draft.current = { title: t, content: body, dirty: true, deleted: false };
      setSaveState('dirty');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 500);
    },
    [flush]
  );
  useEffect(
    () => () => {
      void flush();
    },
    [flush]
  );
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flush]);
  const handleTitleChange = useCallback(
    (t: string) => {
      setTitle(t);
      save(t, content);
    },
    [content, save]
  );
  const handleContentChange = useCallback(
    (body: string) => {
      setContent(body);
      save(title, body);
    },
    [title, save]
  );
  const handleDelete = useCallback(() => {
    const remove = async () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      draft.current.deleted = true;
      await deleteNote(id!);
      if (!useNoteStore.getState().error) router.back();
      else draft.current.deleted = false;
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this note?')) void remove();
    } else
      Alert.alert('Delete note?', 'This removes the note from your synced devices.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: remove },
      ]);
  }, [id, deleteNote, router]);

  // Stable styles so the rendered markdown is not rebuilt on unrelated re-renders.
  const markdownStyles = useMemo(() => buildMarkdownStyles(paper, fonts), [fonts]);
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const back = async () => {
    if (await flush()) {
      if (router.canGoBack()) router.back();
      else router.replace('/notes');
    }
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
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/notes')}
          style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text style={{ color: c.primary }}>Back to notes</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <View
          style={{
            width: '100%',
            maxWidth: 1040,
            alignSelf: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
          <Pressable
            accessibilityLabel="Back to notes"
            accessibilityRole="button"
            onPress={back}
            style={{
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingRight: 12,
            }}>
            <Ionicons name="arrow-back" size={20} color={c.onSurfaceVariant} />
            <Text style={{ color: c.onSurface, fontFamily: fonts.medium, fontSize: 14 }}>
              Notes
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View
              style={{
                flexDirection: 'row',
                padding: 4,
                borderRadius: 10,
                backgroundColor: c.surfaceContainerHigh,
              }}>
              {[
                { label: 'Write', edit: true },
                { label: 'Read', edit: false },
              ].map((mode) => (
                <Pressable
                  key={mode.label}
                  accessibilityRole="button"
                  accessibilityLabel={mode.edit ? 'Edit note' : 'Preview note'}
                  accessibilityState={{ selected: editing === mode.edit }}
                  onPress={async () => {
                    if (await flush()) setEditing(mode.edit);
                  }}
                  style={{
                    minHeight: 40,
                    paddingHorizontal: 12,
                    justifyContent: 'center',
                    borderRadius: 7,
                    backgroundColor:
                      editing === mode.edit ? c.surfaceContainerHighest : 'transparent',
                  }}>
                  <Text
                    style={{
                      color: editing === mode.edit ? c.onSurface : c.onSurfaceVariant,
                      fontFamily: fonts.medium,
                      fontSize: 13,
                    }}>
                    {mode.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityLabel="Pin note"
              accessibilityRole="button"
              accessibilityState={{ selected: note.pinned }}
              onPress={() => togglePin(id!)}
              style={{
                minWidth: 44,
                minHeight: 48,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Ionicons
                name={note.pinned ? 'pin' : 'pin-outline'}
                size={19}
                color={note.pinned ? c.primary : c.onSurfaceVariant}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Delete note"
              accessibilityRole="button"
              onPress={handleDelete}
              style={{
                minWidth: 44,
                minHeight: 48,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Ionicons name="trash-outline" size={19} color={c.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>
        {!!saveError && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry saving note"
            onPress={flush}
            style={{ padding: 16, backgroundColor: c.errorContainer }}>
            <Text accessibilityRole="alert" style={{ color: c.onErrorContainer }}>
              {saveError} · Retry saving
            </Text>
          </Pressable>
        )}
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 }}>
          <View
            testID="note-page"
            style={{
              width: '100%',
              maxWidth: 960,
              alignSelf: 'center',
              flex: 1,
              backgroundColor: paper.surface,
              borderRadius: 16,
              paddingHorizontal: 24,
              paddingTop: 28,
              paddingBottom: 24,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                borderBottomWidth: 1,
                borderBottomColor: paper.rule,
                paddingBottom: 18,
                marginBottom: 24,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={editing ? 'create-outline' : 'book-outline'}
                  size={17}
                  color={paper.muted}
                />
                <Text style={{ color: paper.muted, fontFamily: fonts.medium, fontSize: 12 }}>
                  {editing ? 'A little room to think' : 'Your notebook'}
                </Text>
              </View>
              <Text
                accessibilityLiveRegion="polite"
                style={{
                  color: saveState === 'error' ? '#9c302b' : paper.muted,
                  fontFamily: fonts.regular,
                  fontSize: 12,
                }}>
                {saveState === 'saving'
                  ? 'Saving…'
                  : saveState === 'dirty'
                    ? 'Unsaved changes'
                    : saveState === 'error'
                      ? 'Not saved'
                      : 'Saved on this device'}
              </Text>
            </View>
            <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center', flex: 1 }}>
              {editing ? (
                <TextInput
                  ref={titleRef}
                  value={title}
                  onChangeText={handleTitleChange}
                  autoFocus={isNew}
                  accessibilityLabel="Note title"
                  placeholder="Give this thought a title"
                  placeholderTextColor={paper.muted}
                  multiline
                  maxLength={500}
                  style={{
                    fontFamily: 'PlayfairDisplay_500Medium',
                    fontSize: 34,
                    lineHeight: 43,
                    color: paper.ink,
                    padding: 0,
                    marginBottom: 20,
                  }}
                />
              ) : (
                <Text
                  accessibilityRole="header"
                  style={{
                    fontFamily: 'PlayfairDisplay_500Medium',
                    fontSize: 34,
                    lineHeight: 43,
                    color: paper.ink,
                    marginBottom: 20,
                  }}>
                  {title || 'Untitled'}
                </Text>
              )}
              {editing ? (
                <TextInput
                  value={content}
                  onChangeText={handleContentChange}
                  accessibilityLabel="Note content"
                  placeholder="Start anywhere. A sentence, a list, a whole new idea…"
                  placeholderTextColor={paper.muted}
                  multiline
                  autoFocus={!isNew}
                  textAlignVertical="top"
                  style={{
                    flex: 1,
                    minHeight: 360,
                    fontFamily: fonts.regular,
                    fontSize: 17,
                    lineHeight: 29,
                    color: paper.ink,
                    padding: 0,
                  }}
                />
              ) : content ? (
                <Markdown style={markdownStyles}>{content}</Markdown>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setEditing(true)}
                  style={{
                    minHeight: 240,
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                  <Ionicons name="create-outline" size={26} color={paper.muted} />
                  <Text
                    style={{
                      fontFamily: 'PlayfairDisplay_400Regular',
                      color: paper.ink,
                      fontSize: 25,
                    }}>
                    A blank page, a fresh start.
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, color: paper.muted, fontSize: 14 }}>
                    Tap here to start writing.
                  </Text>
                </Pressable>
              )}
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 12,
                borderTopWidth: 1,
                borderTopColor: paper.rule,
                paddingTop: 18,
                marginTop: 28,
              }}>
              <Text style={{ color: paper.muted, fontFamily: fonts.regular, fontSize: 12 }}>
                {words} {words === 1 ? 'word' : 'words'}
              </Text>
              <Text style={{ color: paper.muted, fontFamily: fonts.regular, fontSize: 12 }}>
                {editing ? 'Markdown supported' : `${Math.max(1, Math.ceil(words / 200))} min read`}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
