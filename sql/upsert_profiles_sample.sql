-- Upsert profiles for two users (replace if IDs change)
insert into public.profiles (user_id, display_name, lang, tone)
select u.id, 'Hanif', 'id', 'ramah ringkas'
from auth.users u
where u.email = 'hanifmaster@uii.ac.id'
on conflict (user_id) do update
set display_name = excluded.display_name,
    lang = excluded.lang,
    tone = excluded.tone,
    updated_at = now();

insert into public.profiles (user_id, display_name, lang, tone)
select u.id, 'Rahmat', 'id', 'ramah ringkas'
from auth.users u
where u.email = 'hanifmaster2@uii.ac.id'
on conflict (user_id) do update
set display_name = excluded.display_name,
    lang = excluded.lang,
    tone = excluded.tone,
    updated_at = now();


