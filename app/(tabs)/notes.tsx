import { Text, View } from 'react-native';
import { useColors, useFontFamily } from '@/utils/theme';

export default function NotesScreen() {
  const c = useColors();
  const fonts = useFontFamily();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: fonts.regular, color: c.outline, fontSize: 18 }}>
        Notes coming soon
      </Text>
    </View>
  );
}
