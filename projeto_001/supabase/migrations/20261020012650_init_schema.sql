-- Schema inicial do DevQuiz Arena (seção 11 do PRD).

-- perfis (1:1 com auth.users). A criação automática no signup entra no M3.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_emoji text default '🙂',
  created_at timestamptz default now()
);

create type public.question_type as enum ('multiple_choice', 'true_false', 'code_output', 'multi_select');
create type public.category as enum ('IA', 'WORKFLOW', 'PROGRAMACAO');
create type public.difficulty as enum ('facil', 'medio', 'dificil');
create type public.question_status as enum ('draft', 'published', 'archived');

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z]+-[0-9]{3}$'), -- ex.: py-001
  type public.question_type not null,
  category public.category not null,
  tags text[] default '{}',
  difficulty public.difficulty not null,
  prompt text not null, -- markdown
  code text,
  code_lang text,
  options jsonb not null check (jsonb_typeof(options) = 'array'), -- [{ "id": "a", "text": "..." }]
  correct jsonb not null check (jsonb_typeof(correct) = 'array'), -- ["b"] ou ["a","c"]
  explanation text not null,
  status public.question_status default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint code_output_has_code check (type <> 'code_output' or code is not null)
);

-- Filtro do sorteio de perguntas (M4/M7).
create index questions_pick_idx on public.questions (status, category, difficulty);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('live', 'solo')),
  host_id uuid references public.profiles,
  settings jsonb not null,
  started_at timestamptz not null,
  ended_at timestamptz
);

create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches on delete cascade,
  user_id uuid references public.profiles,
  nickname text not null,
  team text,
  score int not null,
  correct_count int not null,
  avg_time_ms int,
  rank int
);

create index match_players_match_id_idx on public.match_players (match_id);
create index match_players_user_id_idx on public.match_players (user_id);

create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions,
  user_id uuid references public.profiles,
  reason text,
  created_at timestamptz default now()
);
