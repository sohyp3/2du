import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useNoteStore } from '@/store/noteStore';
import { useThemeStore, NOTE_PAPERS } from '@/store/themeStore';
import { Note } from '@/db/notes';
import { useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from '@/components/PressFeedback';
const SAVED_ENTER = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
const SAVED_EXIT = FadeOut.duration(140).reduceMotion(ReduceMotion.System);

export default function NotesScreen() {
  const { notes, isLoading, error, loadNotes, addNote, togglePin, clearError } = useNoteStore();
  const theme = useThemeStore((s) => s.themeKey);
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const columns = width >= 1500 ? 3 : width >= 700 ? 2 : 1;
  const [query, setQuery] = useState(''),
    [pinnedOnly, setPinnedOnly] = useState(false);
  const [draft, setDraft] = useState(''),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false);
  const input = useRef<TextInput>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);
  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );
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
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const id = await addNote('Untitled');
      router.push(`/note/${id}`);
    } catch {
      /* The store exposes a retryable error below. */
    } finally {
      savingRef.current = false;
    }
  }, [addNote, router]);
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
      setQuery('');
      setPinnedOnly(false);
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
  const paperById = useMemo(
    () =>
      new Map(
        [...notes]
          .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
          .map((note, index) => [note.id, index % 4])
      ),
    [notes]
  );
  const renderNote = ({ item }: { item: Note }) => {
    const tone = NOTE_PAPERS[theme][paperById.get(item.id) || 0];
    let preview = item.content.replace(/[#*_~`>\[\]]/g, '').trim();
    if (preview.startsWith(item.title)) preview = preview.slice(item.title.length).trim();
    const date = new Date(item.updated_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    return (
      <View style={{ flex: 1, maxWidth: `${100 / columns}%`, padding: 8 }}>
        <View
          testID="note-card"
          style={{
            flex: 1,
            minHeight: 230,
            backgroundColor: tone.surface,
            borderWidth: 1,
            borderColor: tone.outline,
            borderRadius: 16,
          }}>
          <PressFeedback
            accessibilityRole="button"
            accessibilityLabel={`Open note ${item.title}`}
            onPress={() => router.push(`/note/${item.id}`)}
            style={{ flex: 1, padding: 24, paddingBottom: 8 }}>
            <Text
              numberOfLines={2}
              style={{
                color: tone.ink,
                fontFamily: 'PlayfairDisplay_500Medium',
                fontSize: 25,
                lineHeight: 32,
                marginBottom: 14,
              }}>
              {item.title}
            </Text>
            <Text
              numberOfLines={4}
              style={{
                color: tone.muted,
                fontFamily: fonts.regular,
                fontSize: 14,
                lineHeight: 23,
              }}>
              {preview || 'An idea with room to grow. Open it and keep going.'}
            </Text>
          </PressFeedback>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: 24,
              paddingRight: 12,
              paddingBottom: 12,
              gap: 8,
            }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View
                style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: tone.accent }}
              />
              <Text style={{ color: tone.muted, fontFamily: fonts.regular, fontSize: 12 }}>
                {date}
              </Text>
            </View>
            <PressFeedback
              accessibilityRole="button"
              accessibilityLabel={`${item.pinned ? 'Unpin' : 'Pin'} note ${item.title}`}
              accessibilityState={{ selected: item.pinned }}
              onPress={() => togglePin(item.id)}
              style={{
                minHeight: 44,
                minWidth: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name={item.pinned ? 'pin' : 'pin-outline'} size={17} color={tone.accent} />
            </PressFeedback>
          </View>
        </View>
      </View>
    );
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <FlatList
        key={columns}
        data={visible}
        numColumns={columns}
        keyExtractor={(n) => n.id}
        renderItem={renderNote}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: '100%',
          maxWidth: 1280,
          alignSelf: 'center',
          paddingHorizontal: desktop ? 40 : 16,
          paddingTop: Platform.OS === 'web' ? 40 : 56,
          paddingBottom: 40,
        }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}>
              <Text
                accessibilityRole="header"
                style={{
                  color: c.onSurface,
                  fontFamily: 'PlayfairDisplay_400Regular',
                  fontSize: desktop ? 46 : 36,
                  flexShrink: 1,
                  letterSpacing: -1,
                }}>
                Notes & thoughts<Text style={{ color: c.primary }}>.</Text>
              </Text>
              <PressFeedback
                accessibilityRole="button"
                accessibilityLabel="New note"
                onPress={handleAdd}
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'center',
                  minHeight: 48,
                  paddingHorizontal: desktop ? 18 : 0,
                  width: desktop ? undefined : 48,
                  flexShrink: 0,
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: c.primary,
                }}>
                <Ionicons name="add" size={20} color={c.onPrimary} />
                {desktop && (
                  <Text style={{ color: c.onPrimary, fontFamily: fonts.medium, fontSize: 14 }}>
                    Write a note
                  </Text>
                )}
              </PressFeedback>
            </View>
            <Text
              style={{
                color: c.onSurfaceVariant,
                fontFamily: fonts.regular,
                fontSize: 15,
                lineHeight: 24,
                marginBottom: 32,
              }}>
              Good ideas start as little thoughts. Make yourself at home.
            </Text>
            <View
              style={{
                backgroundColor: '#eae3d4',
                borderRadius: 16,
                padding: desktop ? 28 : 20,
                marginBottom: 28,
                flexDirection: desktop ? 'row' : 'column',
                gap: desktop ? 36 : 12,
              }}>
              <View style={{ width: desktop ? 200 : undefined }}>
                <Text
                  style={{
                    color: '#342c20',
                    fontFamily: 'PlayfairDisplay_400Regular',
                    fontSize: width < 700 ? 24 : 28,
                    lineHeight: 36,
                  }}>
                  Leave it here.
                </Text>
                {width >= 700 && (
                  <Text
                    style={{
                      color: '#695d49',
                      fontFamily: fonts.regular,
                      fontSize: 13,
                      lineHeight: 21,
                      marginTop: 8,
                    }}>
                    A passing idea, a tiny plan,{'\n'}something to come back to.
                  </Text>
                )}
              </View>
              <View style={{ flex: desktop ? 1 : undefined, minWidth: 0 }}>
                <TextInput
                  ref={input}
                  accessibilityLabel="Capture a thought"
                  placeholder="What’s on your mind?"
                  placeholderTextColor="#786b55"
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  editable={!saving}
                  style={{
                    color: '#342c20',
                    fontFamily: fonts.regular,
                    fontSize: 17,
                    lineHeight: 27,
                    minHeight: desktop ? 76 : 60,
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
                    marginTop: 16,
                  }}>
                  <View style={{ flex: 1, minWidth: 120, minHeight: 24, justifyContent: 'center' }}>
                    {saved ? (
                      <Animated.View
                        entering={Platform.OS === 'web' ? undefined : SAVED_ENTER}
                        exiting={Platform.OS === 'web' ? undefined : SAVED_EXIT}
                        testID="note-saved"
                        accessibilityLiveRegion="polite"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={17} color="#426031" />
                        <Text style={{ color: '#426031', fontFamily: fonts.medium, fontSize: 12 }}>
                          Saved to your notebook
                        </Text>
                      </Animated.View>
                    ) : (
                      <Text style={{ color: '#695d49', fontFamily: fonts.regular, fontSize: 12 }}>
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
                      minHeight: 44,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      backgroundColor: '#342c20',
                      opacity: !draft.trim() || saving ? 0.5 : 1,
                      flexDirection: 'row',
                      gap: 10,
                      alignItems: 'center',
                    }}>
                    <Text style={{ color: '#f7f0e2', fontFamily: fonts.medium, fontSize: 13 }}>
                      {saving ? 'Saving…' : 'Save thought'}
                    </Text>
                    <Ionicons name="arrow-up" size={16} color="#f7f0e2" />
                  </PressFeedback>
                </View>
              </View>
            </View>
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
                gap: 16,
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {[
                  { label: 'All notes', pinned: false },
                  { label: 'Pinned', pinned: true },
                ].map((tab) => (
                  <PressFeedback
                    key={tab.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: pinnedOnly === tab.pinned }}
                    onPress={() => setPinnedOnly(tab.pinned)}
                    style={{
                      flexDirection: 'row',
                      gap: 8,
                      alignItems: 'center',
                      minHeight: 44,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      backgroundColor:
                        pinnedOnly === tab.pinned ? c.surfaceContainerHigh : 'transparent',
                    }}>
                    {tab.pinned && (
                      <Ionicons name="pin-outline" size={14} color={c.onSurfaceVariant} />
                    )}
                    <Text
                      style={{
                        color: pinnedOnly === tab.pinned ? c.onSurface : c.onSurfaceVariant,
                        fontFamily: fonts.medium,
                        fontSize: 13,
                      }}>
                      {tab.label}
                    </Text>
                    {!tab.pinned && (
                      <Text
                        style={{
                          color: c.onSurfaceVariant,
                          fontFamily: fonts.regular,
                          fontSize: 12,
                        }}>
                        {notes.length}
                      </Text>
                    )}
                  </PressFeedback>
                ))}
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderWidth: 1,
                  borderColor: c.outlineVariant,
                  borderRadius: 10,
                  paddingHorizontal: 14,
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
            {isLoading && (
              <Text style={{ color: c.onSurfaceVariant, fontSize: 12, marginBottom: 8 }}>
                Opening your notebook…
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text
              style={{
                color: c.onSurface,
                fontFamily: 'PlayfairDisplay_400Regular',
                fontSize: 26,
                textAlign: 'center',
              }}>
              {query
                ? 'No thoughts found.'
                : pinnedOnly
                  ? 'Keep a good thought close.'
                  : 'Your next idea starts here.'}
            </Text>
            <Text
              style={{
                color: c.onSurfaceVariant,
                fontFamily: fonts.regular,
                fontSize: 14,
                lineHeight: 23,
                marginTop: 10,
                maxWidth: 360,
                textAlign: 'center',
              }}>
              {query
                ? 'Try another word, or clear your search.'
                : pinnedOnly
                  ? 'Pin a note to find it here whenever you need it.'
                  : 'Use the space above for a quick thought, or write a note to explore something bigger.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
