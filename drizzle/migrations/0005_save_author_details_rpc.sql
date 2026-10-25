create or replace function public.save_author_details(
  _author_id uuid,
  _bio text default null,
  _alternate_names text[] default null,
  _photo_url text default null,
  _birth_date text default null,
  _death_date text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if _bio is not null and length(_bio) > 20000 then return false; end if;
  if _photo_url is not null and _photo_url !~ '^https://' then return false; end if;
  if _birth_date is not null and length(_birth_date) > 60 then return false; end if;
  if _death_date is not null and length(_death_date) > 60 then return false; end if;
  if _alternate_names is not null and (cardinality(_alternate_names) > 30 or exists (select 1 from unnest(_alternate_names) n where length(n) > 200)) then return false; end if;

  update public.authors set
    bio = case when bio = '' and _bio is not null then _bio else bio end,
    alternate_names = case when cardinality(alternate_names) = 0 and _alternate_names is not null then _alternate_names else alternate_names end,
    photo_url = case when photo_url is null and _photo_url is not null then _photo_url else photo_url end,
    birth_date = case when birth_date is null and _birth_date is not null then _birth_date else birth_date end,
    death_date = case when death_date is null and _death_date is not null then _death_date else death_date end
  where id = _author_id;

  return found;
end;
$$;

revoke all on function public.save_author_details(uuid, text, text[], text, text, text) from public;
grant execute on function public.save_author_details(uuid, text, text[], text, text, text) to authenticated;
grant execute on function public.save_author_details(uuid, text, text[], text, text, text) to anon;