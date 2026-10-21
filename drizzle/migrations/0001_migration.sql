
drop function if exists public.count_words(text);

create or replace function public.review_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare plain text;
begin
  if pg_trigger_depth() > 1 then return new; end if; -- internal counter updates
  plain := trim(regexp_replace(regexp_replace(regexp_replace(new.body_html, '<[^>]*>', ' ', 'g'), '&[a-zA-Z#0-9]+;', ' ', 'g'), '\s+', ' ', 'g'));
  new.word_count := case when plain = '' then 0 else array_length(regexp_split_to_array(plain, ' '),1) end;
  new.excerpt := left(plain, 320);
  new.updated_at := now();
  if new.affiliate_url is not null and new.affiliate_url <> '' and new.affiliate_url !~ '^https?://' then raise exception 'Links must start with http(s)://'; end if;
  if new.cover_image_url is not null and new.cover_image_url <> '' and new.cover_image_url !~ '^https?://' then raise exception 'Image links must start with http(s)://'; end if;
  if not public.has_role(auth.uid(),'admin') then
    if tg_op = 'INSERT' then new.is_featured := false; new.is_hidden := false; new.like_count := 0; new.comment_count := 0;
    else new.is_featured := old.is_featured; new.is_hidden := old.is_hidden; new.like_count := old.like_count; new.comment_count := old.comment_count; new.user_id := old.user_id; new.book_id := old.book_id; end if;
  end if;
  if not new.is_draft then
    if new.word_count < 100 then
      raise exception 'A full review needs at least 100 words (currently %). Save it as a draft or share a Short Thought instead.', new.word_count;
    end if;
    if new.published_at is null then new.published_at := now(); end if;
  end if;
  return new;
end $$;

create or replace function public.make_dedupe_key(_title text, _author text)
returns text language sql immutable as $$
  select regexp_replace(regexp_replace(lower(coalesce(_title,'')), '^(the|a|an)\s+', ''), '[^a-z0-9]', '', 'g')
    || '|' || regexp_replace(lower(coalesce(_author,'')), '[^a-z0-9]', '', 'g')
$$;
grant execute on function public.make_dedupe_key(text,text) to anon, authenticated;

with seed(slug, title, author, yr, isbn, cat, genres, synopsis) as (values
 ('pride-and-prejudice','Pride and Prejudice','Jane Austen',1813,'9780141439518','fiction'::book_category, array['Classics','Romance'], 'Elizabeth Bennet navigates manners, marriage and first impressions in Regency England, and finds her match in the proud Mr Darcy.'),
 ('beloved','Beloved','Toni Morrison',1987,'9781400033416','fiction', array['Literary Fiction','Historical'], 'Sethe, formerly enslaved, is haunted by the past in a house on the outskirts of Cincinnati.'),
 ('things-fall-apart','Things Fall Apart','Chinua Achebe',1958,'9780385474542','fiction', array['Classics','African Literature'], 'Okonkwo, a proud Igbo leader, watches his world change with the arrival of colonial power and missionaries.'),
 ('the-remains-of-the-day','The Remains of the Day','Kazuo Ishiguro',1989,'9780679731726','fiction', array['Literary Fiction'], 'An English butler takes a road trip and reflects on decades of devoted service.'),
 ('half-of-a-yellow-sun','Half of a Yellow Sun','Chimamanda Ngozi Adichie',2006,'9781400095209','fiction', array['Historical','African Literature'], 'Three lives intersect through the hopes and horrors of the Nigerian Civil War.'),
 ('sapiens','Sapiens','Yuval Noah Harari',2011,'9780062316097','nonfiction', array['History','Science'], 'A brief history of humankind, from the Stone Age to the present.'),
 ('braiding-sweetgrass','Braiding Sweetgrass','Robin Wall Kimmerer',2013,'9781571313560','nonfiction', array['Nature','Essays'], 'Indigenous wisdom, scientific knowledge and the teachings of plants.')
), b as (
  insert into public.books (slug,title,synopsis,cover_url,publication_year,isbn,genres,category,dedupe_key,status,language)
  select slug,title,synopsis,'https://covers.openlibrary.org/b/isbn/'||isbn||'-L.jpg',yr,isbn,genres,cat,public.make_dedupe_key(title,author),'published','English' from seed
  returning id, slug
), a as (
  insert into public.authors (name, name_key)
  select distinct author, regexp_replace(lower(author),'[^a-z0-9]','','g') from seed
  returning id, name
)
insert into public.book_authors (book_id, author_id)
select b.id, a.id from seed join b on b.slug = seed.slug join a on a.name = seed.author;
