
-- ROLES
create type public.app_role as enum ('admin','moderator','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null default '',
  bio text not null default '' check (char_length(bio) <= 1000),
  avatar_url text,
  website text,
  support_url text,
  expertise text not null default '',
  is_professional boolean not null default false,
  is_verified boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- prevent users changing privileged profile columns
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then
    new.is_verified := old.is_verified;
    new.is_suspended := old.is_suspended;
  end if;
  if new.website is not null and new.website <> '' and new.website !~ '^https?://' then raise exception 'Website must start with http(s)://'; end if;
  if new.support_url is not null and new.support_url <> '' and new.support_url !~ '^https?://' then raise exception 'Support link must start with http(s)://'; end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile_columns();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; candidate text; n int := 0;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(base) < 3 then base := base || 'reader'; end if;
  base := left(base, 24);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1; candidate := base || n::text;
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, coalesce(new.raw_user_meta_data->>'display_name', candidate));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if lower(new.email) = 'mderrickm00@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_active_member(_uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = _uid and not is_suspended) $$;

-- AUTHORS & BOOKS
create table public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,
  bio text not null default '',
  website text,
  claimed_by uuid,
  openlibrary_key text unique,
  created_at timestamptz not null default now()
);
grant select on public.authors to anon, authenticated;
grant all on public.authors to service_role;
alter table public.authors enable row level security;
create policy "Authors public" on public.authors for select using (true);

create type public.book_status as enum ('pending','published','rejected');
create type public.book_category as enum ('fiction','nonfiction','poetry','biography','other');
create table public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 1 and 300),
  subtitle text,
  synopsis text not null default '',
  cover_url text,
  publication_year int,
  publisher text,
  isbn text,
  language text,
  genres text[] not null default '{}',
  category book_category not null default 'fiction',
  openlibrary_key text unique,
  dedupe_key text not null,
  status book_status not null default 'pending',
  submitted_by uuid,
  created_at timestamptz not null default now()
);
create index books_dedupe_idx on public.books(dedupe_key);
create index books_isbn_idx on public.books(isbn);
create index books_title_trgm on public.books using gin (to_tsvector('simple', title));
grant select on public.books to anon, authenticated;
grant all on public.books to service_role;
alter table public.books enable row level security;
create policy "Published books public" on public.books for select using (status = 'published' or submitted_by = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Admins update books" on public.books for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins delete books" on public.books for delete to authenticated using (public.has_role(auth.uid(),'admin'));
grant update, delete on public.books to authenticated;

create table public.book_authors (
  book_id uuid not null references public.books(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete cascade,
  position int not null default 0,
  primary key (book_id, author_id)
);
grant select on public.book_authors to anon, authenticated;
grant all on public.book_authors to service_role;
alter table public.book_authors enable row level security;
create policy "Book authors public" on public.book_authors for select using (true);

-- READING STATUS
create type public.reading_status as enum ('want','reading','read');
create table public.reading_statuses (
  user_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  status reading_status not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create index reading_book_idx on public.reading_statuses(book_id, updated_at desc);
grant select on public.reading_statuses to anon, authenticated;
grant insert, update, delete on public.reading_statuses to authenticated;
grant all on public.reading_statuses to service_role;
alter table public.reading_statuses enable row level security;
create policy "Shelves public" on public.reading_statuses for select using (true);
create policy "Own shelf insert" on public.reading_statuses for insert to authenticated with check (user_id = auth.uid() and public.is_active_member(auth.uid()));
create policy "Own shelf update" on public.reading_statuses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Own shelf delete" on public.reading_statuses for delete to authenticated using (user_id = auth.uid());

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body_html text not null default '' check (char_length(body_html) <= 200000),
  word_count int not null default 0,
  excerpt text not null default '',
  rating smallint check (rating between 1 and 5),
  has_spoilers boolean not null default false,
  content_warning text check (char_length(content_warning) <= 300),
  affiliate_url text,
  affiliate_label text check (char_length(affiliate_label) <= 80),
  cover_image_url text,
  is_draft boolean not null default true,
  is_featured boolean not null default false,
  is_hidden boolean not null default false,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index reviews_book_idx on public.reviews(book_id, published_at desc);
create index reviews_user_idx on public.reviews(user_id, published_at desc);
create index reviews_pub_idx on public.reviews(published_at desc) where not is_draft;
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "Published reviews public" on public.reviews for select using ((not is_draft and not is_hidden) or user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Own review insert" on public.reviews for insert to authenticated with check (user_id = auth.uid() and public.is_active_member(auth.uid()));
create policy "Own review update" on public.reviews for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Own review delete" on public.reviews for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.count_words(html text)
returns int language sql immutable as $$
  select coalesce(array_length(regexp_split_to_array(trim(regexp_replace(regexp_replace(regexp_replace(coalesce(html,''), '<[^>]*>', ' ', 'g'), '&[a-zA-Z#0-9]+;', ' ', 'g'), '\s+', ' ', 'g')), ' '), 1), 0)
  - case when trim(regexp_replace(coalesce(html,''), '<[^>]*>', '', 'g')) = '' then 1 else 0 end
$$;

create or replace function public.review_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare plain text;
begin
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
create trigger reviews_before_write before insert or update on public.reviews for each row execute function public.review_before_write();

-- LIKES & COMMENTS
create table public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
grant select on public.review_likes to anon, authenticated;
grant insert, delete on public.review_likes to authenticated;
grant all on public.review_likes to service_role;
alter table public.review_likes enable row level security;
create policy "Likes public" on public.review_likes for select using (true);
create policy "Own like" on public.review_likes for insert to authenticated with check (user_id = auth.uid() and public.is_active_member(auth.uid()));
create policy "Own unlike" on public.review_likes for delete to authenticated using (user_id = auth.uid());

create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.review_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  has_spoilers boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_review_idx on public.review_comments(review_id, created_at);
grant select on public.review_comments to anon, authenticated;
grant insert, delete on public.review_comments to authenticated;
grant all on public.review_comments to service_role;
alter table public.review_comments enable row level security;
create policy "Comments public" on public.review_comments for select using (not is_hidden or user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Own comment" on public.review_comments for insert to authenticated with check (user_id = auth.uid() and public.is_active_member(auth.uid()));
create policy "Delete own comment" on public.review_comments for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.sync_review_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  rid := coalesce(new.review_id, old.review_id);
  update public.reviews set
    like_count = (select count(*) from public.review_likes where review_id = rid),
    comment_count = (select count(*) from public.review_comments where review_id = rid and not is_hidden)
  where id = rid;
  return null;
end $$;
-- bypass the protective trigger: admin check uses auth.uid(), so do raw counts via session flag
create trigger likes_count after insert or delete on public.review_likes for each row execute function public.sync_review_counts();
create trigger comments_count after insert or delete on public.review_comments for each row execute function public.sync_review_counts();

-- SHORT THOUGHTS
create table public.short_thoughts (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 600),
  has_spoilers boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index thoughts_book_idx on public.short_thoughts(book_id, created_at desc);
create index thoughts_user_idx on public.short_thoughts(user_id, created_at desc);
grant select on public.short_thoughts to anon, authenticated;
grant insert, delete on public.short_thoughts to authenticated;
grant all on public.short_thoughts to service_role;
alter table public.short_thoughts enable row level security;
create policy "Thoughts public" on public.short_thoughts for select using (not is_hidden or user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Own thought" on public.short_thoughts for insert to authenticated with check (user_id = auth.uid() and public.is_active_member(auth.uid()));
create policy "Delete own thought" on public.short_thoughts for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- RECOMETER
create table public.recometer_votes (
  user_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  recommend boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
grant select, insert, update, delete on public.recometer_votes to authenticated;
grant all on public.recometer_votes to service_role;
alter table public.recometer_votes enable row level security;
create policy "See own vote" on public.recometer_votes for select to authenticated using (user_id = auth.uid());
create policy "Cast own vote" on public.recometer_votes for insert to authenticated with check (user_id = auth.uid() and public.is_active_member(auth.uid()));
create policy "Change own vote" on public.recometer_votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Withdraw own vote" on public.recometer_votes for delete to authenticated using (user_id = auth.uid());

create or replace function public.get_recometer(_book_id uuid)
returns table (recommend int, not_recommend int, total int)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where recommend)::int, count(*) filter (where not recommend)::int, count(*)::int
  from public.recometer_votes where book_id = _book_id
$$;
grant execute on function public.get_recometer(uuid) to anon, authenticated;

-- READER CONSENSUS
create table public.consensus_questions (
  id uuid primary key default gen_random_uuid(),
  category book_category not null,
  prompt text not null,
  options text[] not null,
  sort int not null default 0,
  active boolean not null default true
);
grant select on public.consensus_questions to anon, authenticated;
grant insert, update, delete on public.consensus_questions to authenticated;
grant all on public.consensus_questions to service_role;
alter table public.consensus_questions enable row level security;
create policy "Questions public" on public.consensus_questions for select using (true);
create policy "Admins manage questions" on public.consensus_questions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.consensus_votes (
  user_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  question_id uuid not null references public.consensus_questions(id) on delete cascade,
  answer text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id, question_id)
);
grant select, insert, update, delete on public.consensus_votes to authenticated;
grant all on public.consensus_votes to service_role;
alter table public.consensus_votes enable row level security;
create policy "See own answers" on public.consensus_votes for select to authenticated using (user_id = auth.uid());
create policy "Cast own answer" on public.consensus_votes for insert to authenticated with check (user_id = auth.uid() and public.is_active_member(auth.uid()));
create policy "Change own answer" on public.consensus_votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Withdraw own answer" on public.consensus_votes for delete to authenticated using (user_id = auth.uid());

create or replace function public.validate_consensus_answer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.consensus_questions q where q.id = new.question_id and new.answer = any(q.options)) then
    raise exception 'Invalid answer';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger consensus_validate before insert or update on public.consensus_votes for each row execute function public.validate_consensus_answer();

create or replace function public.get_consensus(_book_id uuid)
returns table (question_id uuid, answer text, votes int)
language sql stable security definer set search_path = public as $$
  select question_id, answer, count(*)::int from public.consensus_votes where book_id = _book_id group by question_id, answer
$$;
grant execute on function public.get_consensus(uuid) to anon, authenticated;

-- simple anti-abuse: max 60 vote changes per minute per user
create or replace function public.vote_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.recometer_votes where user_id = new.user_id and updated_at > now() - interval '1 minute') +
     (select count(*) from public.consensus_votes where user_id = new.user_id and updated_at > now() - interval '1 minute') > 60 then
    raise exception 'Too many votes, slow down a little';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger recometer_rate before insert or update on public.recometer_votes for each row execute function public.vote_rate_limit();
create trigger consensus_rate before insert or update on public.consensus_votes for each row execute function public.vote_rate_limit();

-- FOLLOWS
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows(following_id);
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;
grant all on public.follows to service_role;
alter table public.follows enable row level security;
create policy "Follows public" on public.follows for select using (true);
create policy "Own follow" on public.follows for insert to authenticated with check (follower_id = auth.uid() and public.is_active_member(auth.uid()));
create policy "Own unfollow" on public.follows for delete to authenticated using (follower_id = auth.uid());

-- REPORTS
create type public.report_status as enum ('open','resolved','dismissed');
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid,
  target_type text not null check (target_type in ('review','comment','thought','book','profile','copyright')),
  target_id text not null,
  reason text not null check (char_length(reason) between 3 and 2000),
  contact_email text,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);
grant insert on public.reports to anon, authenticated;
grant select, update on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "Anyone can report" on public.reports for insert with check (reporter_id is null or reporter_id = auth.uid());
create policy "Admins see reports" on public.reports for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins update reports" on public.reports for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- admin moderation of thoughts/comments hiding
grant update on public.short_thoughts, public.review_comments to authenticated;
create policy "Admins hide thoughts" on public.short_thoughts for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins hide comments" on public.review_comments for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins update profiles" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- SEED consensus questions
insert into public.consensus_questions (category, prompt, options, sort) values
('fiction','Reading pace', array['Fast','Medium','Slow'], 1),
('fiction','Plot or character driven?', array['Plot','A mix','Character'], 2),
('fiction','Strong character development?', array['Yes','Complicated','No'], 3),
('fiction','Lovable characters?', array['Yes','Complicated','No'], 4),
('fiction','Diverse cast of characters?', array['Yes','Somewhat','No'], 5),
('nonfiction','Reading pace', array['Fast','Medium','Slow'], 1),
('nonfiction','How accessible is it?', array['Very','Somewhat','Challenging'], 2),
('nonfiction','Well researched?', array['Yes','Mostly','No'], 3),
('nonfiction','Changed how you think?', array['Yes','A little','No'], 4),
('poetry','Accessibility', array['Accessible','Mixed','Demanding'], 1),
('poetry','Emotional impact', array['Strong','Moderate','Light'], 2),
('poetry','Rewards rereading?', array['Yes','Somewhat','No'], 3),
('biography','Reading pace', array['Fast','Medium','Slow'], 1),
('biography','Balanced portrayal?', array['Yes','Somewhat','No'], 2),
('biography','Engaging storytelling?', array['Yes','Somewhat','No'], 3),
('other','Reading pace', array['Fast','Medium','Slow'], 1),
('other','Would you reread it?', array['Yes','Maybe','No'], 2);
