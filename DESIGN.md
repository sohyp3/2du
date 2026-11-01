---
name: 2du
description: A warm, quiet workspace for tasks, calendars, and thoughts.
colors:
  note-editor-paper: "#f1eadc"
  note-editor-rule: "#d8cfbd"
  note-editor-code: "#e2dacb"
  priority-urgent-dark-ink: "#f1aaa0"
  priority-urgent-dark-bg: "#432722"
  priority-normal-dark-ink: "#e6c77e"
  priority-normal-dark-bg: "#3b321e"
  priority-low-dark-ink: "#b9d68a"
  priority-low-dark-bg: "#2b3620"
  priority-urgent-light-ink: "#9c302b"
  priority-urgent-light-bg: "#fbe8e5"
  priority-normal-light-ink: "#80550f"
  priority-normal-light-bg: "#fbf0d3"
  priority-low-light-ink: "#426127"
  priority-low-light-bg: "#e7efdc"
  surface: "#0d0c0a"
  surfaceDim: "#0b0a09"
  surfaceContainer: "#171613"
  surfaceContainerLow: "#12110f"
  surfaceContainerHigh: "#23211c"
  surfaceContainerHighest: "#302d26"
  onSurface: "#fbf7ef"
  onSurfaceVariant: "#b3aa9a"
  primary: "#a7c968"
  primaryContainer: "#29351d"
  primaryDim: "#c0d895"
  onPrimary: "#17200e"
  outline: "#a39a8b"
  outlineVariant: "#343129"
  secondary: "#bb8ed6"
  error: "#eeaba0"
  errorContainer: "#42241f"
  onErrorContainer: "#f7c7be"
  note-dark-1-surface: "#30291e"
  note-dark-1-ink: "#f9edda"
  note-dark-1-muted: "#c9bda5"
  note-dark-1-accent: "#e6c77e"
  note-dark-1-outline: "#504636"
  note-dark-2-surface: "#252d23"
  note-dark-2-ink: "#edf2dd"
  note-dark-2-muted: "#b5c2a8"
  note-dark-2-accent: "#b9d68a"
  note-dark-2-outline: "#3d4b36"
  note-dark-3-surface: "#2d2530"
  note-dark-3-ink: "#f1e5ef"
  note-dark-3-muted: "#c7b1c5"
  note-dark-3-accent: "#dab4dc"
  note-dark-3-outline: "#4c3c50"
  note-dark-4-surface: "#222c30"
  note-dark-4-ink: "#e2eff2"
  note-dark-4-muted: "#acc2ca"
  note-dark-4-accent: "#a4d5e1"
  note-dark-4-outline: "#3c4d53"
  note-silver-1-surface: "#f4ead8"
  note-silver-1-ink: "#332b1d"
  note-silver-1-muted: "#685a43"
  note-silver-1-accent: "#786027"
  note-silver-1-outline: "#ddceb3"
  note-silver-2-surface: "#e7eddf"
  note-silver-2-ink: "#283320"
  note-silver-2-muted: "#526344"
  note-silver-2-accent: "#506b32"
  note-silver-2-outline: "#c8d5bd"
  note-silver-3-surface: "#eee4ef"
  note-silver-3-ink: "#38273b"
  note-silver-3-muted: "#6e5674"
  note-silver-3-accent: "#795584"
  note-silver-3-outline: "#d8c6dc"
  note-silver-4-surface: "#e2edf0"
  note-silver-4-ink: "#24343a"
  note-silver-4-muted: "#4f6670"
  note-silver-4-accent: "#396777"
  note-silver-4-outline: "#c0d6de"
  note-composer-paper: "#eae3d4"
  note-composer-ink: "#342c20"
  note-composer-muted: "#695d49"
  note-composer-placeholder: "#786b55"
  note-composer-success: "#426031"
  note-composer-button-ink: "#f7f0e2"
typography:
  note-editor-title:
    fontFamily: PlayfairDisplay_500Medium
    fontSize: 34px
    lineHeight: 1.2647058824
    fontWeight: 500
  note-editor-body:
    fontFamily: Inter_400Regular
    fontSize: 17px
    lineHeight: 1.7058823529
    fontWeight: 400
  display:
    fontFamily: PlayfairDisplay_400Regular
    fontSize: 46px
    fontWeight: 400
    letterSpacing: -1px
  headline:
    fontFamily: PlayfairDisplay_400Regular
    fontSize: 36px
    fontWeight: 400
  title:
    fontFamily: Inter_500Medium
    fontSize: 16px
    lineHeight: 1.5
    fontWeight: 500
  body:
    fontFamily: Inter_400Regular
    fontSize: 14px
    lineHeight: 1.5714285714
    fontWeight: 400
  label:
    fontFamily: Inter_500Medium
    fontSize: 13px
    fontWeight: 500
  note-title:
    fontFamily: PlayfairDisplay_500Medium
    fontSize: 25px
    lineHeight: 1.28
    fontWeight: 500
  note-preview:
    fontFamily: Inter_400Regular
    fontSize: 14px
    lineHeight: 1.6428571428571428
    fontWeight: 400
  thought-input:
    fontFamily: Inter_400Regular
    fontSize: 17px
    lineHeight: 1.588235294117647
    fontWeight: 400
  thought-heading:
    fontFamily: PlayfairDisplay_400Regular
    fontSize: 28px
    lineHeight: 1.2857142857142858
    fontWeight: 400
rounded:
  field: 6px
  segment: 7px
  control: 8px
  navigation: 10px
  container: 12px
  paper: 16px
spacing:
  step-4: 4px
  step-8: 8px
  step-12: 12px
  step-14: 14px
  step-16: 16px
  step-18: 18px
  step-24: 24px
  step-28: 28px
  step-48: 48px
  step-20: 20px
  step-32: 32px
  step-36: 36px
  step-40: 40px
components:
  note-editor:
    backgroundColor: "{colors.note-editor-paper}"
    textColor: "{colors.note-composer-ink}"
    rounded: "{rounded.paper}"
    padding: 28px 24px 24px
  priority-urgent:
    backgroundColor: "{colors.priority-urgent-dark-bg}"
    textColor: "{colors.priority-urgent-dark-ink}"
    height: 52px
    rounded: "{rounded.navigation}"
  priority-normal:
    backgroundColor: "{colors.priority-normal-dark-bg}"
    textColor: "{colors.priority-normal-dark-ink}"
    height: 52px
    rounded: "{rounded.navigation}"
  priority-low:
    backgroundColor: "{colors.priority-low-dark-bg}"
    textColor: "{colors.priority-low-dark-ink}"
    height: 52px
    rounded: "{rounded.navigation}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    rounded: "{rounded.field}"
    padding: 0px 16px
    height: 48px
  button-ghost:
    textColor: "{colors.primary}"
    padding: 0px 14px
    height: 44px
  input-capture:
    backgroundColor: "{colors.surfaceContainerHigh}"
    textColor: "{colors.onSurface}"
    rounded: "{rounded.field}"
    padding: 0px 12px
    height: 48px
  capture-container:
    backgroundColor: "{colors.surfaceContainer}"
    rounded: "{rounded.container}"
    padding: 8px
  calendar-chip:
    textColor: "{colors.onSurfaceVariant}"
    rounded: "{rounded.container}"
    padding: 0px 14px
    height: 44px
  calendar-chip-selected:
    backgroundColor: "{colors.surfaceContainerHigh}"
    textColor: "{colors.onSurface}"
    rounded: "{rounded.container}"
    padding: 0px 14px
    height: 44px
  period-segment-selected:
    backgroundColor: "{colors.surfaceContainerHighest}"
    textColor: "{colors.onSurface}"
    rounded: "{rounded.segment}"
    padding: 0px 18px
    height: 40px
  navigation-active:
    backgroundColor: "{colors.surfaceContainerHigh}"
    textColor: "{colors.onSurface}"
    rounded: "{rounded.navigation}"
    padding: 0px 12px
    height: 48px
  note-card:
    backgroundColor: "{colors.note-dark-1-surface}"
    textColor: "{colors.note-dark-1-ink}"
    typography: "{typography.note-title}"
    rounded: "{rounded.paper}"
    padding: 24px 24px 8px
  thought-composer:
    backgroundColor: "{colors.note-composer-paper}"
    textColor: "{colors.note-composer-ink}"
    rounded: "{rounded.paper}"
    padding: 28px
  thought-save:
    backgroundColor: "{colors.note-composer-ink}"
    textColor: "{colors.note-composer-button-ink}"
    rounded: "{rounded.navigation}"
    padding: 0px 16px
    height: 44px
---

# Design System: 2du

## Overview

**Creative North Star: "A little more intentional."**

2du uses the user-pinned autismaxer.quest visual world: warm near-black surfaces, ivory editorial headings, quiet controls, and restrained moss and plum accents. Generous space supports focused work while hairline divisions keep tasks and thoughts easy to scan.

The same hierarchy adapts from a phone to a desktop workspace. Native interaction conventions govern behavior: capture and completion respond immediately, tabs do not slide, and press feedback is brief. This document records implemented code and supplied web review captures; it makes no physical-device validation claim.

**Key Characteristics:**
- Warm dark surfaces with ivory serif headings.
- Selected states use tonal layers and restrained color.
- Flat task rows and softly tinted notebook cards.
- Adaptive navigation and short, reduced-motion-aware feedback.

## Colors

The default Quest palette pairs a warm dark ground with soft ivory, moss actions, and plum secondary accents. Frontmatter preserves the exact runtime theme names and values.

### Primary

Moss (`primary`) identifies the Add action, Today links, completed checks, and active navigation icons. `primaryContainer`, `primaryDim`, and `onPrimary` provide the implemented supporting roles.

### Secondary

Plum (`secondary`) complements calendar colors and browser selection. Calendars have user-configurable colors; dots must accompany a calendar name rather than replace it.

### Neutral

`surface` is the page ground; `surfaceDim` anchors navigation. The container family distinguishes capture, selection, and grouped controls. `onSurface` carries main text, `onSurfaceVariant` carries secondary text, and the outline pair separates structure. Error tokens identify urgent flags, retry panels, and errors.

Notes adds four decorative paper tones from NOTE_PAPERS: warm amber, moss, plum, and blue. Quest and Gold share the dark paper set; Silver has its own lighter set. Each set records surface, ink, muted, accent, and outline roles in frontmatter. Tones cycle by creation order (with ID as tie-breaker), independently of pinning, search, and edit sorting. They carry no category or priority meaning. The fixed warm composer uses its own paper, ink, muted, placeholder, success, and button-ink roles in every theme.

**The Theme Source Rule.** Quest values come from store/themeStore.ts through useColors(); persisted Silver and Gold remain supported alternatives. The older global.css palette variables are not the runtime Quest source.

## Typography

Display and page headings use loaded Playfair Display independently of the selected body font. Default controls and body copy use Inter. Settings also offers Playfair Display and Cormorant Garamond for the regular, medium, and bold body families; preserve this preference through useFontFamily().

The task heading uses the display role at wide widths and the headline role below the wide breakpoint. Other page headings use headline size; Notes uses display size at the desktop navigation breakpoint. Empty-state and rail headings use Playfair (26px). Task titles use the title role; supporting copy uses body; filters and calendar chips use label. Metadata is smaller (12px), and bottom-tab labels are compact (11px). The desktop wordmark uses Playfair medium (38px) with close tracking (-1px).

Notes previews intentionally extend this hierarchy: fixed Playfair medium titles use the note-title role, selected-font body previews use note-preview, and thought entry uses thought-input. The composer heading is (24px) below viewport width (700px), otherwise the thought-heading role. Its line height stays (36px).

Frontmatter records the default Inter roles and loaded Expo family identifiers. In standalone HTML, the corresponding human family names are Playfair Display and Inter; font files must be available for exact rendering.

## Layout

The shell switches at viewport width (1000px): desktop has a fixed left rail (240px), while narrower views use bottom tabs (78px height). Tasks uses a centered content region capped at (1500px). At viewport width (1280px), task padding grows from (24px) to (48px), the heading grows, and a contextual notes rail (300px) appears unless Zen mode is enabled. The task top inset is (40px) on web and (56px) on native.

Calendar uses the same maximum content width. Settings centers its contents within (840px). Spacing is component-specific, using the extracted frontmatter steps rather than a strict mathematical scale. Filter controls wrap, calendar chips scroll horizontally, and main flex columns allow shrinking content with minWidth: 0.

Notes centers its content within (1280px), using one column below (700px), two columns from (700px), and three from (1500px), based on viewport width. Each card has outer padding (8px). Desktop page padding is (40px); smaller layouts use (16px). At (1000px), the thought composer changes from a vertical stack to a row with a label column (200px), its padding changes from (20px) to (28px), and its gap changes from (12px) to (36px).

## Elevation & Depth

The redesigned task, navigation, note, and capture surfaces use tonal layering and thin borders rather than cast shadows. Persistent rails use hairline separators; active controls move to higher surface tones. This describes the main workspace, not a claim that every legacy route has no shadow styles.

**The Quiet Depth Rule.** Use the implemented surface layers and separators for hierarchy in the main workspace; do not add decorative shadows to its flat rows.

## Shapes

Small softened rectangles distinguish interactive controls: field, segment, control, navigation, and container radii are in frontmatter. Navigation and segmented controls nest their corners inside slightly larger groups. Task rows remain flat with bottom borders (1px). Notes previews and the thought composer use paper corners (16px); previews carry a thin outline (1px). Calendar dots are small circles; completion uses a drawn circular icon with a separate touch area.

## Components

### Buttons

The capture Add action uses moss fill and dark text, a field radius, and a minimum touch height (48px). Text actions use moss without a filled container. Period arrows use container surfaces and control corners. Main task period arrows and Today controls have minimum height (44px); Calendar's corresponding controls have minimum height (48px). Do not infer that every control has the same dimensions.

On web, shared PressFeedback uses the explicit motion-press selector: press scales to (0.97) with opacity (0.78) over (140ms), excluding disabled controls. Fine-pointer hover normally changes opacity to (0.86); buttons inside note cards remain fully opaque on hover. Legacy role selectors retain (120ms) feedback for other controls. Web focus uses a moss outline (2px) offset by (4px). Native PressFeedback retains pressed opacity (0.8), scale (0.98), and duration (120ms). All share cubic-bezier(0.23, 1, 0.32, 1); reduced motion removes scaling and retains opacity feedback over (120ms). Native stack navigation uses the platform default transition, or fade with reduced motion; tabs use no animation.

### Chips

Calendar chips combine a named label and colored dot with a thin outline. Selected chips use the high container surface, stronger outline, and main text. Period segments sit in a padded container; selected segments use the highest surface tone. Tasks segments have minimum height (40px); Calendar segments have minimum height (48px). Selected state is exposed to accessibility APIs.

### Cards / Containers

Quick capture uses a container surface and rounded container shape with padding (8px). Its field and action sit side by side with a gap (8px). Notes intentionally extends the dark workspace with tinted, bordered previews at minimum height (230px). Preview content has padding (24px) and bottom padding (8px); its date and independent pin action sit in a footer. Titles truncate after two lines, previews after four. The pin action has a minimum target (44px). Fine-pointer hover or focus within lifts a card by (-4px) over (180ms); reduced motion removes the lift. There are no card entrance animations.

### Inputs / Fields

The capture field uses the high container surface, main text, an outline-colored placeholder, and a minimum height (48px). Text is (16px) with line height (20px), preserving a compact but legible field. It keeps focus after a successful capture. Browser caret and visible focus use moss.

### Thought composer

A warm paper block provides immediate multiline capture. Its dark Save thought button uses a navigation radius and minimum height (44px), with half opacity while empty or saving. The first line becomes the title. Successful save clears the draft, resets filters, and returns input focus; persistence errors retain the draft. Confirmation uses a polite live region and appears for (2600ms). On web it enters with a (6px) upward translation and opacity over (240ms); reduced motion uses opacity only over (120ms). Native confirmation uses FadeIn (180ms) and FadeOut (140ms) with system reduced-motion handling. The input minimum height is (76px) on desktop and (60px) below.

### Navigation

Desktop links combine an outline icon, medium label, and minimum height (48px). The active row uses the high container surface, ivory text, and a moss icon. On smaller screens, bottom tabs retain active moss and muted inactive labels. Route changes are immediate. Navigation ThemeProvider and sceneStyle receive the active palette so scene gutters match the app surface. Calendar retains its mounted view during local month-cache filtering rather than replacing it with a full-screen loader or remounting the day grid.

### Task rows

Separate completion and edit controls have named accessibility labels and minimum touch height (48px). Completion uses the primary circular check and strikes through the title; metadata keeps its own readable color. Rows use vertical padding (14px), a gap (12px), and a bottom separator. Calendar identity, date, and duration sit below the title.

### Individual note page and priorities

The note reader/editor uses a warm paper surface (960px maximum) around a text column capped at700px. The title is Playfair medium34px/43px; writing and rendered body use the selected body family17px/29px. The outer shell stays themed. Labeled Write/Read controls, pin, delete and Back to notes have separate targets. Autosave distinguishes unsaved, saving, saved locally, and failed states; navigation flushes the latest draft. The footer shows word count and Markdown support or reading time. On paper, secondary text and placeholders use note-composer-muted; keyboard focus uses a contrasting brown outline.

Task priority selectors are shared between create and edit. Urgent uses red, Normal uses amber, and Can wait uses green, with separate dark/light tones. Labels, a selected check icon, a border, and accessibility selection state accompany the color; minimum height52px. Normal preserves the stored/API value `moderate`.

## Do's and Don'ts

### Do:

- Do use useColors() for shared themed surfaces and text, and NOTE_PAPERS for note previews.
- Do retain fixed Playfair headings while respecting the selected body font.
- Do expose selected and checked states alongside visible color changes.
- Do preserve immediate capture, completion, and real empty states.
- Do treat notebook paper colors as decoration rather than categories.

### Don't:

- Don't add moving task data or sliding tab transitions.
- Don't fade an entire completed row; retain readable metadata and use the implemented title strike-through.
- Don't treat the legacy global CSS palette as the Quest theme source.
- Don't claim native hardware validation from browser screenshots.
