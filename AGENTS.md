<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Packing list state is saved through a serialized user-scoped Cloud client queue; keep all bulk edits atomic to avoid stale-state overwrites.
- Public sign-in pages live outside the client-only authenticated layout; private trip data uses the Cloud client with owner-scoped RLS.
- List photos use private owner-prefixed Storage objects and signed URLs; never expose public photo URLs.
- Home-screen support is manifest-only plus a notification-only service worker (public/sw.js: shows notifications and opens the app on tap; no fetch handler, no caching) because offline use was not requested.
- Resolve unmatched additions in a category-confirmation dialog before one atomic list update, so cancelling never partially adds a batch.
- "Generate more ideas" is rule-based (src/lib/packing-ideas.ts): themed idea pools chosen by holiday type, weather, amenities and trip length. It needs no AI service or API key.
- Look: the default is the Plain style (flat, ruled, Barlow fonts, solid colour bar; CSS at the end of src/styles.css, scoped to :root:not([data-style="classic"])). Settings -> Style -> Classic restores the original rounded/gradient look. Both styles must keep identical layout and behaviour; only colours, fonts, borders and shapes differ. Emoji are wrapped in <span class="classic-only"> so Plain hides them.
- Layout: phones (<768px) get a bottom Trips/Settings tab bar, a swipeable strip of trips, and a sticky add-an-item bar; computers get a sticky trips sidebar, a wider page, a two-column packing list on large screens and "/" to focus the add box. Same behaviour on both; only layout differs.
- Leaving reminders: each trip can have leaveTime (HH:MM on startDate) and remindMins (10/15/30). src/lib/reminder.ts (pure, tested) decides when it is due; src/components/leave-reminder.tsx shows a "forgotten anything?" banner and a notification while the app is open or in the background, and offers a calendar (.ics) file with an alarm for when the app is closed. There is no server push, so a closed app cannot notify. The app icon is a suitcase with a tick (public/icons).
- Printable copy: the button at the bottom of a trip draws pages of lined paper (src/lib/print-render.ts, canvas, Caveat handwriting font loaded on click with fallbacks) and wraps them in a hand-built PDF (src/lib/print-sheet.ts, pure and tested). No dependencies or AI. Ticked items are crossed off.
- The printable copy font is chosen in Settings -> Printable list handwriting (PRINT_FONTS in print-sheet.ts; saved in localStorage key pack-smart-print-font, separate from the theme so Reset does not touch it).
