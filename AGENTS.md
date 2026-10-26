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
- Home-screen support is manifest-only, without an app-shell service worker, because offline use was not requested.
- Resolve unmatched additions in a category-confirmation dialog before one atomic list update, so cancelling never partially adds a batch.
- "Generate more ideas" is rule-based (src/lib/packing-ideas.ts): themed idea pools chosen by holiday type, weather, amenities and trip length. It needs no AI service or API key.
