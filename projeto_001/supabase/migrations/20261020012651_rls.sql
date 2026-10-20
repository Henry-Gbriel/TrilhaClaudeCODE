-- RLS (seção 11 do PRD). O servidor usa a secret key (service_role), que ignora RLS.

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.question_reports enable row level security;

-- questions: só o servidor. Sem policies e sem grants, para não depender só do RLS
-- (o Supabase concede grants em tabelas novas do public para anon/authenticated).
revoke all on public.questions from anon, authenticated;

-- profiles: cada usuário lê e edita só o próprio perfil.
create policy "profiles: ler o próprio" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: criar o próprio" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles: editar o próprio" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- matches / match_players: escrita só pelo servidor; leitura só das partidas em que o usuário jogou.
-- security definer evita recursão de RLS ao consultar match_players de dentro da policy dela.
create function public.is_match_participant(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.match_players mp
    where mp.match_id = p_match_id
      and mp.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_match_participant(uuid) from public, anon;
grant execute on function public.is_match_participant(uuid) to authenticated;

create policy "matches: ler as próprias" on public.matches
  for select to authenticated
  using ((select public.is_match_participant(id)));

create policy "match_players: ler das próprias partidas" on public.match_players
  for select to authenticated
  using ((select public.is_match_participant(match_id)));

-- question_reports: o usuário insere os próprios; leitura só pelo servidor.
create policy "question_reports: criar os próprios" on public.question_reports
  for insert to authenticated
  with check (user_id = (select auth.uid()));
