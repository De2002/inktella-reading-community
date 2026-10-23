create or replace function public.create_book(
  _title text, _authors jsonb, _subtitle text default null, _synopsis text default '',
  _cover_url text default null, _year int default null, _publisher text default null,
  _isbn text default null, _genres text[] default '{}', _category public.book_category default 'other',
  _openlibrary_key text default null
) returns table(slug text, status public.book_status, existed boolean)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_admin boolean;
  k text; base text; cand text; new_id uuid; st public.book_status;
  a jsonb; aname text; akey text; aid uuid; pos int := 0;
begin
  if uid is null or not public.is_active_member(uid) then raise exception 'Please sign in'; end if;
  _title := trim(coalesce(_title,''));
  if char_length(_title) < 1 or char_length(_title) > 300 then raise exception 'Please enter a title'; end if;
  if _authors is null or jsonb_array_length(_authors) = 0 then raise exception 'Please enter the author''s name'; end if;
  if _cover_url is not null and _cover_url !~ '^https?://' then raise exception 'Invalid cover link'; end if;
  if _openlibrary_key is not null and _openlibrary_key !~ '^/works/OL[0-9]+W$' then raise exception 'Invalid book reference'; end if;
  if (select count(*) from public.books b where b.submitted_by = uid and b.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many submissions, try again later';
  end if;
  is_admin := public.has_role(uid, 'admin');

  if _openlibrary_key is not null then
    return query select b.slug, b.status, true from public.books b where b.openlibrary_key = _openlibrary_key;
    if found then return; end if;
  end if;
  k := public.make_dedupe_key(_title, _authors->0->>'name');
  return query select b.slug, b.status, true from public.books b where b.dedupe_key = k limit 1;
  if found then return; end if;
  if _isbn is not null and _isbn <> '' then
    return query select b.slug, b.status, true from public.books b where b.isbn = _isbn limit 1;
    if found then return; end if;
  end if;

  base := trim(both '-' from regexp_replace(lower(_title), '[^a-z0-9]+', '-', 'g'));
  if base = '' then base := 'book'; end if;
  base := left(base, 80);
  cand := base;
  if exists (select 1 from public.books b where b.slug = cand) and _year is not null then cand := base || '-' || _year; end if;
  while exists (select 1 from public.books b where b.slug = cand) loop
    cand := base || '-' || substr(md5(random()::text), 1, 5);
  end loop;

  st := case when is_admin or _openlibrary_key is not null then 'published' else 'pending' end;
  insert into public.books (slug, title, subtitle, synopsis, cover_url, publication_year, publisher, isbn, genres, category, openlibrary_key, dedupe_key, status, submitted_by)
  values (cand, _title, _subtitle, left(coalesce(_synopsis,''), 5000), _cover_url, _year, _publisher, nullif(_isbn,''), coalesce(_genres,'{}'), _category, _openlibrary_key, k, st, uid)
  returning id into new_id;

  for a in select * from jsonb_array_elements(_authors) limit 4 loop
    aname := left(trim(coalesce(a->>'name','')), 200);
    akey := regexp_replace(lower(aname), '[^a-z0-9]', '', 'g');
    continue when akey = '';
    select au.id into aid from public.authors au where au.name_key = akey;
    if aid is null then
      insert into public.authors (name, name_key, openlibrary_key)
      values (aname, akey, case when (a->>'olKey') ~ '^/authors/OL[0-9]+A$' and not exists (select 1 from public.authors x where x.openlibrary_key = a->>'olKey') then a->>'olKey' end)
      returning id into aid;
    end if;
    insert into public.book_authors (book_id, author_id, position) values (new_id, aid, pos) on conflict do nothing;
    pos := pos + 1; aid := null;
  end loop;

  return query select cand, st, false;
end $$;
revoke all on function public.create_book(text, jsonb, text, text, text, int, text, text, text[], public.book_category, text) from public, anon;
grant execute on function public.create_book(text, jsonb, text, text, text, int, text, text, text[], public.book_category, text) to authenticated;