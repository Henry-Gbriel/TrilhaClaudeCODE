-- profiles: cada usuário lê, cria e edita só o próprio perfil.
begin;
select plan(7);

-- O trigger on_auth_user_created cria os perfis a partir do full_name.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com', '{"full_name":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@example.com', '{"full_name":"Bia"}'),
  ('00000000-0000-0000-0000-00000000000c', 'caio@example.com', '{"full_name":"Caio"}');
-- Caio ainda não tem perfil (simula um perfil apagado), para testar a criação pelo próprio usuário.
delete from public.profiles where id = '00000000-0000-0000-0000-00000000000c';

set local role anon;
select is_empty('select * from public.profiles', 'anon não vê perfis');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select results_eq('select display_name from public.profiles', $$values ('Ana')$$, 'usuário vê só o próprio perfil');

update public.profiles set display_name = 'Bia hackeada' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set display_name = 'Ana Clara' where id = '00000000-0000-0000-0000-00000000000a';
select results_eq('select display_name from public.profiles', $$values ('Ana Clara')$$, 'usuário edita o próprio perfil');

select throws_ok(
  $$update public.profiles set id = '00000000-0000-0000-0000-00000000000b' where id = '00000000-0000-0000-0000-00000000000a'$$,
  '42501', null, 'usuário não troca o id do perfil para o de outro'
);

select throws_ok(
  $$insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-00000000000c', 'Caio')$$,
  '42501', null, 'usuário não cria perfil de outro'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select lives_ok(
  $$insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-00000000000c', 'Caio')$$,
  'usuário cria o próprio perfil'
);
reset role;

select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'Bia',
  'perfil de outro usuário não foi alterado'
);

select * from finish();
rollback;
