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

## Architecture rules
- Community rules (review word minimum, vote uniqueness, vote tallies, privileged columns) are enforced in the database via constraints, triggers and security-definer RPCs; the UI only mirrors them via src/lib/rules.ts. Why: the frontend must never be authoritative.
- Vote results are read only through get_recometer / get_consensus RPCs; raw vote rows are visible only to their owner. Why: privacy and server-calculated totals.
- Book creation goes through the create_book security-definer RPC (called from src/lib/books.functions.ts with the user's session; dedupe + slug + authors in SQL). Why: the app must not need a service role key, so it can run on any host with only the publishable key.
- Uploads go to the private "uploads" bucket under the user's id folder and are referenced by long-lived signed URLs. Why: public buckets are blocked in this workspace.
- User HTML (reviews) is sanitised with DOMPurify at render time (SafeHtml). Why: safe handling of user content.
- Profile recommendations and favourites use separate book_lists records; view history is owner-only in book_views. Why: shelves must reflect independent choices and browsing history must remain private.
- Author catalogue details are read through a bounded Open Library server function; stored author overrides take precedence. Missing details auto-save through the save_author_details security-definer RPC, which only fills empty fields. Why: optional external metadata must not require a service-role key or overwrite curated information.
