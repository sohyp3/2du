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
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { buildMarkdownStyles } from '@/utils/markdownStyles';
import { useNoteStore } from '@/store/noteStore';
import { PressFeedback as Pressable } from '@/components/PressFeedback';
import { NOTE_PAPERS, type NotePaper } from '@/store/themeStore';
import { contrastText } from '@/utils/palette';
import {
  DISPLAY_FONT,
  radius,
  space,
  type,
  useColors,
  useFontFamily,
  useScheme,
} from '@/utils/theme';

const SAVED_HOLD_MS = 1600;

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
  const scheme = useScheme();
  // Same tint as the note's card in the grid: by creation order, rotating through four.
  const paperIndex = useMemo(() => {
    const order = [...notes]
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
      .findIndex((n) => n.id === id);
    return Math.max(0, order) % 4;
  }, [notes, id]);
  const tone = NOTE_PAPERS[scheme][paperIndex];

  const isNew = note?.title === 'Untitled' && !note?.content;
  const [title, setTitle] = useState(isNew ? '' : (note?.title ?? ''));
  const [content, setContent] = useState(note?.content ?? '');
  const [editing, setEditing] = useState(!note?.content);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<TextInput>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');

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
  const markdownStyles = useMemo(() => {
    const base = buildMarkdownStyles(
      { ink: tone.ink, muted: tone.muted, rule: tone.outline, link: tone.accent },
      fonts
    );
    return { ...base, body: { ...base.body, ...type.body, lineHeight: 26 } };
  }, [tone, fonts]);
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

  const roundButton = {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tone.outline,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tone.surface }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <View
          style={{
            width: '100%',
            maxWidth: 820,
            alignSelf: 'center',
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.sm,
          }}>
          <Pressable
            haptic="tap"
            accessibilityLabel="Back to notes"
            accessibilityRole="button"
            onPress={back}
            style={roundButton}>
            <Ionicons name="arrow-back" size={20} color={tone.ink} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View
              style={{
                flexDirection: 'row',
                padding: 4,
                borderRadius: radius.pill,
                backgroundColor: tone.outline,
              }}>
              {[
                { label: 'Write', edit: true },
                { label: 'Read', edit: false },
              ].map((mode) => (
                <Pressable
                  key={mode.label}
                  haptic="select"
                  accessibilityRole="button"
                  accessibilityLabel={mode.edit ? 'Edit note' : 'Preview note'}
                  accessibilityState={{ selected: editing === mode.edit }}
                  onPress={async () => {
                    if (await flush()) setEditing(mode.edit);
                  }}
                  style={{
                    minHeight: 36,
                    paddingHorizontal: 14,
                    justifyContent: 'center',
                    borderRadius: radius.pill,
                    backgroundColor: editing === mode.edit ? tone.surface : 'transparent',
                  }}>
                  <Text
                    style={{
                      color: editing === mode.edit ? tone.ink : tone.muted,
                      fontFamily: fonts.bold,
                      ...type.label,
                    }}>
                    {mode.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              haptic="tap"
              accessibilityLabel={note.pinned ? 'Unpin note' : 'Pin note'}
              accessibilityRole="button"
              accessibilityState={{ selected: note.pinned }}
              onPress={() => togglePin(id!)}
              style={roundButton}>
              <Ionicons
                name={note.pinned ? 'pin' : 'pin-outline'}
                size={19}
                color={note.pinned ? tone.accent : tone.ink}
              />
            </Pressable>
            <Pressable
              haptic="tap"
              accessibilityLabel="Delete note"
              accessibilityRole="button"
              onPress={handleDelete}
              style={roundButton}>
              <Ionicons name="trash-outline" size={19} color={tone.ink} />
            </Pressable>
          </View>
        </View>
        {!!saveError && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry saving note"
            onPress={flush}
            style={{
              marginHorizontal: space.lg,
              padding: space.lg,
              borderRadius: radius.md,
              backgroundColor: c.errorContainer,
            }}>
            <Text accessibilityRole="alert" style={{ color: c.onErrorContainer }}>
              {saveError} · Retry saving
            </Text>
          </Pressable>
        )}
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: 40, flexGrow: 1 }}>
          <View
            testID="note-page"
            style={{
              width: '100%',
              maxWidth: 700,
              alignSelf: 'center',
              flex: 1,
              paddingTop: space.md,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: space.md,
                minHeight: 28,
                marginBottom: space.lg,
              }}>
              <Text style={{ color: tone.muted, fontFamily: fonts.medium, ...type.caption }}>
                {editing ? 'A little room to think' : 'Your notebook'}
              </Text>
              <SaveIndicator state={saveState} tone={tone} />
            </View>
            {editing ? (
              <TextInput
                ref={titleRef}
                value={title}
                onChangeText={handleTitleChange}
                autoFocus={isNew}
                accessibilityLabel="Note title"
                placeholder="Give this thought a title"
                placeholderTextColor={tone.muted}
                multiline
                maxLength={500}
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: 28,
                  lineHeight: 34,
                  letterSpacing: -0.5,
                  color: tone.ink,
                  padding: 0,
                  marginBottom: space.lg,
                }}
              />
            ) : (
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: 28,
                  lineHeight: 34,
                  letterSpacing: -0.5,
                  color: tone.ink,
                  marginBottom: space.lg,
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
                placeholderTextColor={tone.muted}
                multiline
                autoFocus={!isNew}
                textAlignVertical="top"
                style={{
                  flex: 1,
                  minHeight: 360,
                  fontFamily: fonts.regular,
                  ...type.body,
                  lineHeight: 26,
                  color: tone.ink,
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
                  gap: space.sm,
                }}>
                <Text style={{ fontSize: 44, lineHeight: 54 }}>✍️</Text>
                <Text style={{ fontFamily: DISPLAY_FONT, color: tone.ink, ...type.title }}>
                  A blank page, a fresh start.
                </Text>
                <Text style={{ fontFamily: fonts.regular, color: tone.muted, ...type.label }}>
                  Tap here to start writing.
                </Text>
              </Pressable>
            )}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: space.md,
                borderTopWidth: 1,
                borderTopColor: tone.outline,
                paddingTop: space.lg,
                marginTop: space.xl,
              }}>
              <Text style={{ color: tone.muted, fontFamily: fonts.regular, ...type.caption }}>
                {words} {words === 1 ? 'word' : 'words'}
              </Text>
              <Text style={{ color: tone.muted, fontFamily: fonts.regular, ...type.caption }}>
                {editing ? 'Markdown supported' : `${Math.max(1, Math.ceil(words / 200))} min read`}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

/**
 * Quiet while you type; a small success pill fades in when a save lands and fades out again.
 * Web uses the `note-saved` keyframes in global.css, native a Reanimated opacity.
 */
function SaveIndicator({ state, tone }: { state: SaveState; tone: NotePaper }) {
  const c = useColors(),
    fonts = useFontFamily();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'hidden' | 'in' | 'out'>('hidden');
  const prev = useRef(state);
  const opacity = useSharedValue(0);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  useEffect(() => {
    const was = prev.current;
    prev.current = state;
    if (state !== 'saved' || was !== 'saving') {
      if (state !== 'saved') setPhase('hidden');
      return;
    }
    setPhase('in');
    opacity.value = withTiming(1, { duration: reduced ? 0 : 180 });
    const hold = setTimeout(() => {
      setPhase('out');
      opacity.value = withTiming(0, { duration: reduced ? 0 : 200 });
    }, SAVED_HOLD_MS);
    const done = setTimeout(() => setPhase('hidden'), SAVED_HOLD_MS + 220);
    return () => {
      clearTimeout(hold);
      clearTimeout(done);
    };
  }, [state, reduced, opacity]);

  if (state === 'error') {
    return (
      <View
        accessibilityLiveRegion="polite"
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: c.errorContainer,
        }}>
        <Text style={{ color: c.onErrorContainer, fontFamily: fonts.bold, ...type.caption }}>
          Not saved
        </Text>
      </View>
    );
  }
  if (state === 'saving' || state === 'dirty') {
    return (
      <Text
        accessibilityLiveRegion="polite"
        style={{ color: tone.muted, fontFamily: fonts.regular, ...type.caption }}>
        {state === 'saving' ? 'Saving…' : 'Unsaved changes'}
      </Text>
    );
  }
  if (phase === 'hidden') return null;
  const web = Platform.OS === 'web';
  return (
    <Animated.View
      testID={web ? (phase === 'out' ? 'note-saved-out' : 'note-saved') : undefined}
      accessibilityLiveRegion="polite"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: c.success,
        },
        web ? null : fade,
      ]}>
      <Ionicons name="checkmark" size={13} color={contrastText(c.success)} />
      <Text style={{ color: contrastText(c.success), fontFamily: fonts.bold, ...type.caption }}>
        Saved
      </Text>
    </Animated.View>
  );
}
