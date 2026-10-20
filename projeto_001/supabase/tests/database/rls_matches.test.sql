-- matches / match_players: escrita só pelo servidor; leitura só das partidas em que o usuário jogou.
begin;
select plan(9);

-- O trigger on_auth_user_created cria os perfis a partir do full_name.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com', '{"full_name":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@example.com', '{"full_name":"Bia"}'),
  ('00000000-0000-0000-0000-00000000000c', 'caio@example.com', '{"full_name":"Caio"}');

-- Partida 1: Ana e Bia. Partida 2: só Caio.
insert into public.matches (id, mode, host_id, settings, started_at) values
  ('10000000-0000-0000-0000-000000000001', 'live', '00000000-0000-0000-0000-00000000000a', '{}', now()),
  ('10000000-0000-0000-0000-000000000002', 'solo', null, '{}', now());
insert into public.match_players (match_id, user_id, nickname, score, correct_count) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Ana', 900, 3),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Bia', 700, 2),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 'Caio', 500, 1);

set local role anon;
select is_empty('select * from public.matches', 'anon não vê partidas');
select is_empty('select * from public.match_players', 'anon não vê jogadores');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select results_eq('select id from public.matches', $$values ('10000000-0000-0000-0000-000000000001'::uuid)$$,
  'usuário vê só as partidas em que jogou');
select results_eq('select nickname from public.match_players order by nickname', $$values ('Ana'), ('Bia')$$,
  'usuário vê todos os jogadores das próprias partidas, e só delas');

select throws_ok(
  $$insert into public.matches (mode, settings, started_at) values ('solo', '{}', now())$$,
  '42501', null, 'usuário não cria partida'
);
select throws_ok(
  $$insert into public.match_players (match_id, user_id, nickname, score, correct_count)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Ana', 99999, 99)$$,
  '42501', null, 'usuário não insere resultado'
);

update public.match_players set score = 99999;
delete from public.matches;
reset role;

select is((select max(score) from public.match_players), 900, 'usuário não altera placar');
select is((select count(*) from public.matches), 2::bigint, 'usuário não apaga partidas');

set local role anon;
select throws_ok(
  $$select public.is_match_participant('10000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'anon não executa is_match_participant'
);
reset role;

select * from finish();
rollback;
