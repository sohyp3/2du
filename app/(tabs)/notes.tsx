import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useNoteStore } from '@/store/noteStore';
import { useThemeStore, NOTE_PAPERS, type NotePaper } from '@/store/themeStore';
import { Note } from '@/db/notes';
import {
  DISPLAY_FONT_SEMI,
  radius,
  space,
  type,
  useColors,
  useFontFamily,
  useScheme,
} from '@/utils/theme';
import { PressFeedback } from '@/components/PressFeedback';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Chip } from '@/components/Chip';
const SAVED_ENTER = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
const SAVED_EXIT = FadeOut.duration(140).reduceMotion(ReduceMotion.System);

const noteKey = (n: Note) => n.id;

export default function NotesScreen() {
  const notes = useNoteStore((s) => s.notes),
    isLoading = useNoteStore((s) => s.isLoading),
    error = useNoteStore((s) => s.error),
    loadNotes = useNoteStore((s) => s.loadNotes),
    addNote = useNoteStore((s) => s.addNote);
  const theme = useScheme();
  const showGreeting = useThemeStore((s) => s.showGreeting);
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const columns = width >= 1500 ? 4 : width >= 1000 ? 3 : width >= 340 ? 2 : 1;
  const [query, setQuery] = useState(''),
    [pinnedOnly, setPinnedOnly] = useState(false);
  const creatingRef = useRef(false);
  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return notes
      .filter(
        (n) =>
          (!pinnedOnly || n.pinned) &&
          (!q || `${n.title}\n${n.content}`.toLocaleLowerCase().includes(q))
      )
      .sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)
      );
  }, [notes, query, pinnedOnly]);
  const handleAdd = useCallback(async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    try {
      const id = await addNote('Untitled');
      router.push(`/note/${id}`);
    } catch {
      /* The store exposes a retryable error below. */
    } finally {
      creatingRef.current = false;
    }
  }, [addNote, router]);
  const handleThoughtSaved = useCallback(() => {
    setQuery('');
    setPinnedOnly(false);
  }, []);
  const paperById = useMemo(
    () =>
      new Map(
        [...notes]
          .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
          .map((note, index) => [note.id, index % 4])
      ),
    [notes]
  );
  const renderNote = useCallback(
    ({ item }: { item: Note }) => (
      <NoteCard
        note={item}
        tone={NOTE_PAPERS[theme][paperById.get(item.id) || 0]}
        columns={columns}
      />
    ),
    [theme, paperById, columns]
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <FlatList
        key={columns}
        data={visible}
        numColumns={columns}
        keyExtractor={noteKey}
        renderItem={renderNote}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: '100%',
          maxWidth: 1280,
          alignSelf: 'center',
          paddingHorizontal: desktop ? 32 : 12,
          paddingBottom: 40,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 4 }}>
            <ScreenHeader
              emoji="💭"
              title="Notes"
              showSettings
              subtitle={
                showGreeting
                  ? 'Good ideas start as little thoughts. Make yourself at home.'
                  : undefined
              }
              actions={
                <PressFeedback
                  haptic="tap"
                  accessibilityRole="button"
                  accessibilityLabel="New note"
                  onPress={handleAdd}
                  style={{
                    flexDirection: 'row',
                    gap: space.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 44,
                    paddingHorizontal: desktop ? space.lg : 0,
                    width: desktop ? undefined : 44,
                    borderRadius: radius.pill,
                    backgroundColor: c.primary,
                  }}>
                  <Ionicons name="add" size={22} color={c.onPrimary} />
                  {desktop && (
                    <Text style={{ color: c.onPrimary, fontFamily: fonts.bold, ...type.label }}>
                      Write a note
                    </Text>
                  )}
                </PressFeedback>
              }
            />
            <NoteComposer
              showGreeting={showGreeting}
              desktop={desktop}
              width={width}
              onSaved={handleThoughtSaved}
            />
            {error && (
              <View
                accessibilityRole="alert"
                style={{
                  padding: 16,
                  backgroundColor: c.errorContainer,
                  borderRadius: 12,
                  marginBottom: 16,
                }}>
                <Text style={{ color: c.onErrorContainer, fontFamily: fonts.regular }}>
                  {error} Your draft is still here.
                </Text>
              </View>
            )}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Chip
                  label={`All notes · ${notes.length}`}
                  selected={!pinnedOnly}
                  onPress={() => setPinnedOnly(false)}
                />
                <Chip label="📌 Pinned" selected={pinnedOnly} onPress={() => setPinnedOnly(true)} />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: c.surfaceContainer,
                  borderRadius: radius.pill,
                  paddingHorizontal: space.lg,
                  minHeight: 44,
                  flexGrow: desktop ? 0 : 1,
                  minWidth: desktop ? 240 : 180,
                }}>
                <Ionicons name="search-outline" size={17} color={c.onSurfaceVariant} />
                <TextInput
                  accessibilityLabel="Search notes"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Find a thought…"
                  placeholderTextColor={c.outline}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    color: c.onSurface,
                    fontFamily: fonts.regular,
                    fontSize: 14,
                    paddingVertical: 10,
                  }}
                />
                {query.length > 0 && (
                  <PressFeedback
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    onPress={() => setQuery('')}
                    style={{
                      minHeight: 44,
                      minWidth: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name="close" size={17} color={c.onSurfaceVariant} />
                  </PressFeedback>
                )}
              </View>
            </View>
            {isLoading && !notes.length && (
              <Text style={{ color: c.onSurfaceVariant, fontSize: 12, marginBottom: 8 }}>
                Opening your notebook…
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: space.xxl, alignItems: 'center' }}>
            <Text style={{ fontSize: 56, lineHeight: 68 }}>✍️</Text>
            <Text
              style={{
                color: c.onSurface,
                fontFamily: DISPLAY_FONT_SEMI,
                ...type.title,
                marginTop: space.sm,
                textAlign: 'center',
              }}>
              {query
                ? 'No thoughts found.'
                : pinnedOnly
                  ? 'Keep a good thought close.'
                  : 'Jot something down'}
            </Text>
            <Text
              style={{
                color: c.onSurfaceVariant,
                fontFamily: fonts.regular,
                ...type.label,
                marginTop: space.sm,
                maxWidth: 360,
                textAlign: 'center',
              }}>
              {query
                ? 'Try another word, or clear your search.'
                : pinnedOnly
                  ? 'Pin a note to find it here whenever you need it.'
                  : 'A quick thought above, or a whole note for something bigger.'}
            </Text>
            {!query && (
              <PressFeedback
                haptic="tap"
                accessibilityRole="button"
                onPress={handleAdd}
                style={{
                  marginTop: space.lg,
                  minHeight: 48,
                  paddingHorizontal: space.xl,
                  borderRadius: radius.pill,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  backgroundColor: c.primary,
                }}>
                <Ionicons name="create-outline" size={20} color={c.onPrimary} />
                <Text style={{ fontFamily: fonts.bold, ...type.body, color: c.onPrimary }}>
                  Write a note
                </Text>
              </PressFeedback>
            )}
          </View>
        }
      />
    </View>
  );
}

// Owns its own draft state so typing a quick thought re-renders only this box,
// not the note grid behind it.
const NoteComposer = memo(function NoteComposer({
  showGreeting,
  desktop,
  width,
  onSaved,
}: {
  showGreeting: boolean;
  desktop: boolean;
  width: number;
  onSaved: () => void;
}) {
  const c = useColors();
  const fonts = useFontFamily();
  const addNote = useNoteStore((s) => s.addNote);
  const clearError = useNoteStore((s) => s.clearError);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const input = useRef<TextInput>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );
  const saveThought = async () => {
    const content = draft.trim();
    if (!content || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    clearError();
    try {
      await addNote(content.split('\n')[0].slice(0, 100), content);
      setDraft('');
      setSaved(true);
      onSaved();
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2600);
      input.current?.focus();
    } catch {
      /* Keep the draft when persistence fails. */
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };
  return (
    <View
      style={{
        backgroundColor: c.surfaceContainer,
        borderRadius: radius.lg,
        padding: desktop ? space.lg : 14,
        marginBottom: 12,
        flexDirection: desktop ? 'row' : 'column',
        gap: desktop ? 20 : 6,
      }}>
      {showGreeting && (
        <View style={{ width: desktop ? 200 : undefined }}>
          <Text
            style={{
              color: c.onSurface,
              fontFamily: DISPLAY_FONT_SEMI,
              fontSize: 20,
              lineHeight: 26,
            }}>
            Leave it here.
          </Text>
          {width >= 700 && (
            <Text
              style={{
                color: c.onSurfaceVariant,
                fontFamily: fonts.regular,
                fontSize: 13,
                lineHeight: 21,
                marginTop: 8,
              }}>
              A passing idea, a tiny plan,{'\n'}something to come back to.
            </Text>
          )}
        </View>
      )}
      <View style={{ flex: desktop ? 1 : undefined, minWidth: 0 }}>
        <TextInput
          ref={input}
          accessibilityLabel="Capture a thought"
          placeholder="What’s on your mind?"
          placeholderTextColor={c.outline}
          value={draft}
          onChangeText={setDraft}
          multiline
          editable={!saving}
          style={{
            color: c.onSurface,
            fontFamily: fonts.regular,
            fontSize: 14,
            lineHeight: 20,
            minHeight: 44,
            padding: 0,
            textAlignVertical: 'top',
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 6,
          }}>
          <View style={{ flex: 1, minWidth: 120, minHeight: 24, justifyContent: 'center' }}>
            {saved ? (
              <Animated.View
                entering={Platform.OS === 'web' ? undefined : SAVED_ENTER}
                exiting={Platform.OS === 'web' ? undefined : SAVED_EXIT}
                testID="note-saved"
                accessibilityLiveRegion="polite"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-circle" size={17} color={c.primary} />
                <Text style={{ color: c.primary, fontFamily: fonts.medium, fontSize: 12 }}>
                  Saved to your notebook
                </Text>
              </Animated.View>
            ) : (
              <Text style={{ color: c.onSurfaceVariant, fontFamily: fonts.regular, fontSize: 12 }}>
                The first line becomes your title.
              </Text>
            )}
          </View>
          <PressFeedback
            accessibilityRole="button"
            accessibilityLabel="Save thought"
            disabled={!draft.trim() || saving}
            onPress={saveThought}
            style={{
              minHeight: 36,
              paddingHorizontal: space.lg,
              borderRadius: radius.pill,
              backgroundColor: c.primary,
              opacity: !draft.trim() || saving ? 0.5 : 1,
              flexDirection: 'row',
              gap: 10,
              alignItems: 'center',
            }}>
            <Text style={{ color: c.onPrimary, fontFamily: fonts.medium, fontSize: 13 }}>
              {saving ? 'Saving…' : 'Save thought'}
            </Text>
            <Ionicons name="arrow-up" size={16} color={c.onPrimary} />
          </PressFeedback>
        </View>
      </View>
    </View>
  );
});

const NoteCard = memo(function NoteCard({
  note,
  tone,
  columns,
}: {
  note: Note;
  tone: NotePaper;
  columns: number;
}) {
  const fonts = useFontFamily(),
    router = useRouter(),
    togglePin = useNoteStore((s) => s.togglePin);
  let preview = note.content.replace(/[#*_~`>\[\]]/g, '').trim();
  if (preview.startsWith(note.title)) preview = preview.slice(note.title.length).trim();
  const date = new Date(note.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return (
    <View style={{ flex: 1, maxWidth: `${100 / columns}%`, padding: 6 }}>
      <View
        testID="note-card"
        style={{
          flex: 1,
          minHeight: 140,
          backgroundColor: tone.surface,
          borderRadius: radius.lg,
        }}>
        <PressFeedback
          accessibilityRole="button"
          accessibilityLabel={`Open note ${note.title}`}
          onPress={() => router.push(`/note/${note.id}`)}
          style={{ flex: 1, padding: space.lg, paddingRight: 44, paddingBottom: space.xs }}>
          <Text
            numberOfLines={2}
            style={{
              color: tone.ink,
              fontFamily: fonts.bold,
              fontSize: 16,
              lineHeight: 21,
              marginBottom: 6,
            }}>
            {note.title}
          </Text>
          <Text
            numberOfLines={6}
            style={{
              color: tone.muted,
              fontFamily: fonts.regular,
              fontSize: 13,
              lineHeight: 19,
            }}>
            {preview || 'An idea with room to grow. Open it and keep going.'}
          </Text>
        </PressFeedback>
        <Text
          style={{
            color: tone.muted,
            fontFamily: fonts.medium,
            ...type.caption,
            paddingHorizontal: space.lg,
            paddingBottom: space.md,
          }}>
          {date}
        </Text>
        <PressFeedback
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel={`${note.pinned ? 'Unpin' : 'Pin'} note ${note.title}`}
          accessibilityState={{ selected: note.pinned }}
          onPress={() => togglePin(note.id)}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {note.pinned ? (
            <Text style={{ fontSize: 18, lineHeight: 22 }}>📌</Text>
          ) : (
            <Ionicons name="pin-outline" size={16} color={tone.muted} />
          )}
        </PressFeedback>
      </View>
    </View>
  );
});
