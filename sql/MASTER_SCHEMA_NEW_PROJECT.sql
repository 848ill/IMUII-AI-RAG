-- ====================================================================
-- AURA UII — MASTER SCHEMA & SETUP FOR NEW SUPABASE PROJECT
-- ====================================================================
-- Petunjuk:
-- 1. Buat project baru di Supabase (disarankan Region: Singapore / ap-southeast-1)
-- 2. Buka menu "SQL Editor" -> "New Query"
-- 3. Paste seluruh skrip ini dan klik "Run" (selesai dalam ~5 detik!)
-- 4. Buka menu "Storage" -> Create 2 Bucket Public:
--    - 'chat-files' (centang Public bucket)
--    - 'documents'  (centang Public bucket)
-- 5. Copy Project URL dan Anon Key ke file .env.local di aplikasi!
-- ====================================================================

-- 1. TABEL: CHAT SESSIONS
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

-- 2. TABEL: CHAT MESSAGES
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('user','assistant')) not null,
  content text not null,
  created_at timestamptz default now()
);

-- 3. TABEL: CHAT FILES (Attachment File Chat)
create table if not exists public.chat_files (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  message_id uuid references public.chat_messages(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  storage_path text not null,
  storage_url text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- 4. TABEL: DOCUMENTS (Knowledge Base RAG Ingestion)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text not null,
  url text,
  status text default 'pending',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 5. TABEL: PROFILES
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  tone text default 'ramah ringkas',
  interests text,
  lang text default 'id',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-trigger create profile when new user signs up (via Email or Google)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- INDEXES UNTUK KECEPATAN QUERY
create index if not exists chat_sessions_user_id_idx on public.chat_sessions(user_id);
create index if not exists chat_messages_session_id_idx on public.chat_messages (session_id, created_at);
create index if not exists chat_files_session_id_idx on public.chat_files (session_id);
create index if not exists chat_files_user_id_idx on public.chat_files (user_id);
create index if not exists documents_created_at_idx on public.documents (created_at desc);

-- ENABLE ROW LEVEL SECURITY (RLS)
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_files enable row level security;
alter table public.documents enable row level security;
alter table public.profiles enable row level security;

-- POLICIES: CHAT SESSIONS
create policy "Users can view own sessions or anon" on public.chat_sessions
  for select using (auth.uid() = user_id or user_id is null or auth.role() = 'anon');

create policy "Users can insert sessions" on public.chat_sessions
  for insert with check (auth.uid() = user_id or auth.role() = 'anon');

create policy "Users can update own sessions" on public.chat_sessions
  for update using (auth.uid() = user_id or auth.role() = 'anon');

create policy "Users can delete own sessions" on public.chat_sessions
  for delete using (auth.uid() = user_id or auth.role() = 'anon');

-- POLICIES: CHAT MESSAGES
create policy "Allow access to messages" on public.chat_messages
  for all using (true) with check (true);

-- POLICIES: CHAT FILES
create policy "Allow access to chat files" on public.chat_files
  for all using (true) with check (true);

-- POLICIES: DOCUMENTS
create policy "Allow access to documents" on public.documents
  for all using (true) with check (true);

-- POLICIES: PROFILES
create policy "Users can read profiles" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id);

-- ENABLE REALTIME UNTUK CHAT
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_sessions;
