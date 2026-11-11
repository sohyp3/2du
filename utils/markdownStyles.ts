import { Platform } from 'react-native';

export interface MarkdownInk {
  ink: string;
  muted: string;
  rule: string;
  link?: string;
  codeBg?: string;
}

export function buildMarkdownStyles(
  paper: MarkdownInk,
  fonts: { regular: string; medium: string; bold: string }
) {
  return {
    body: { color: paper.ink, fontFamily: fonts.regular, fontSize: 17, lineHeight: 29 },
    heading1: {
      color: paper.ink,
      fontFamily: 'PlayfairDisplay_500Medium',
      fontSize: 32,
      lineHeight: 40,
      marginTop: 24,
      marginBottom: 12,
    },
    heading2: {
      color: paper.ink,
      fontFamily: 'PlayfairDisplay_500Medium',
      fontSize: 26,
      lineHeight: 34,
      marginTop: 20,
      marginBottom: 10,
    },
    heading3: {
      color: paper.ink,
      fontFamily: fonts.medium,
      fontSize: 20,
      lineHeight: 28,
      marginVertical: 12,
    },
    link: { color: paper.link ?? '#426031', textDecorationLine: 'underline' as const },
    blockquote: {
      borderLeftColor: paper.rule,
      borderLeftWidth: 1,
      paddingLeft: 16,
      backgroundColor: 'transparent',
    },
    code_inline: {
      backgroundColor: paper.codeBg ?? '#e2dacb',
      color: paper.ink,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 14,
    },
    fence: {
      backgroundColor: paper.codeBg ?? '#e2dacb',
      color: paper.ink,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 14,
      padding: 16,
      borderRadius: 8,
    },
    bullet_list_icon: { color: paper.muted },
    ordered_list_icon: { color: paper.muted },
    hr: { backgroundColor: paper.rule },
    strong: { fontFamily: fonts.bold },
    em: { fontStyle: 'italic' as const },
  };
}
