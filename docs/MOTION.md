# Motion decisions

## Opportunities

| Location | Gap / purpose | Frequency | Implemented motion |
|---|---|---|---|
| `components/PressFeedback.tsx` | Feedback on deliberate buttons | Tens/day | Reanimated CSS transition on native; CSS on web. Scale 1 → .98, opacity 1 → .8, 120 ms, cubic-bezier(.23,1,.32,1). Reduced motion keeps opacity only. |
| `app/_layout.tsx` | Spatial consistency when opening task editor | Occasional | Expo Router's native modal/push transitions. System reduced motion uses fade. Same return path; native interactive back remains available. |
| `components/TodoItem.tsx` | Completion feedback and immediate save | Tens/day | Press feedback on the checkbox; status commits immediately. Static checked icon conveys success. |

## Rejected candidates

- Tab switches: high-frequency peer navigation. No slides, no transition wait. Old core Animated/PanResponder swipe route implementation removed.
- Calendar paging and filters: information the user is reading must remain still. Instant updates.
- Task/note row entrances: frequent, recycled lists. No row entrance or stagger.
- Ambient grid, moving background, progress rings from the reference: decoration does not help a task workspace. Palette/type are retained without ambient motion.
- Completion fanfare: repeated completion should not trigger sound or 800ms motion. The former delayed commit and scale-from-zero tick are removed.

## Performance check

Only transform/opacity animate. No per-frame React state updates, layout-property animation, inherited animated CSS variables, animated blur, permanent will-change, or animation timer loops. Native Reanimated runs motion on its UI runtime. Web uses CSS transitions, eligible for compositor acceleration; hover is gated to fine pointers. React state updates only at press-in/out. Native stack transitions stay on the platform.

Verified from source; a physical slow-device release recording is still needed to establish frame delivery. Try rapid repeated presses, cancel a press by moving away, open/close the task modal mid-transition, test large text and reduced motion. No new gestures need velocity handoff.

## Notes follow-up (2026-10-31)

| Location | Before | Purpose / frequency | Motion |
|---|---|---|---|
| Notes preview | No hover feedback | Feedback; tens/day | Fine pointer only: card transform translateY(0) → translateY(-4px), 180ms cubic-bezier(.23,1,.32,1). Reduced motion: static. Keyboard focus gets the same cue. |
| Shared PressFeedback on web | Very subtle generic feedback | Feedback; tens/day | Explicit selector for shared buttons; scale(1) → scale(.97), opacity .78, 140ms cubic-bezier(.23,1,.32,1). Reduced motion: opacity only, 120ms. |
| Quick capture confirmation | No inline capture | State indication; occasional | Web CSS note-confirm: opacity0/translateY(6px) → opacity1/translateY(0), 240ms cubic-bezier(.23,1,.32,1). Reduced motion: opacity-only 120ms. Native Reanimated FadeIn180/FadeOut140 with system reduced motion. |

Rejected: tab/page entrances (frequent navigation), calendar date-grid motion (functional data), and virtualized note-row mount animations (would replay while scrolling). The calendar now stays mounted; changing a selected day within the month filters already loaded data instead of starting another screen load.

Verified in Chromium by sampling the live transition: hover intermediate Y=-3.816px then -4px; press scale=.970443; save-confirm CSS animation240ms with transform/opacity keyframes; reduced-motion hover transform=none. Only transform/opacity animate; no per-frame React renders, layout animation, permanent GPU layers, or animated blur. Frame delivery on physical devices is unverified.
