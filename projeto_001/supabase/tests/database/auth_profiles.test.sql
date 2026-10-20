-- Perfil automático no signup e edição restrita a nome e avatar.
begin;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com', '{"full_name":"Ana Souza","name":"ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@example.com', '{"user_name":"bia-dev"}'),
  ('00000000-0000-0000-0000-00000000000c', 'caio.lima@example.com', '{"full_name":"   "}'),
  ('00000000-0000-0000-0000-00000000000d', null, null),
  ('00000000-0000-0000-0000-00000000000e', 'x@example.com',
    '{"full_name":"Um Nome Muito Comprido Que Passa Do Limite"}');

select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Ana Souza', 'usa full_name (Google/GitHub)');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'bia-dev', 'usa user_name do GitHub quando não há nome');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000c'),
  'caio.lima', 'ignora nome em branco e cai na parte do e-mail');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000d'),
  'Jogador', 'sem nome nem e-mail vira Jogador');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000e'),
  'Um Nome Muito Comprido Q', 'trunca em 24 caracteres');
select is((select avatar_emoji from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  '🙂', 'avatar padrão');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$update public.profiles set display_name = 'Ana', avatar_emoji = '🚀' where id = '00000000-0000-0000-0000-00000000000a'$$,
  'usuário edita nome e avatar'
);
select throws_ok(
  $$update public.profiles set created_at = now() where id = '00000000-0000-0000-0000-00000000000a'$$,
  '42501', null, 'usuário não edita created_at'
);
select throws_ok(
  $$update public.profiles set display_name = '' where id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', null, 'nome vazio é rejeitado'
);
reset role;

select results_eq(
  $$select display_name, avatar_emoji from public.profiles where id = '00000000-0000-0000-0000-00000000000a'$$,
  $$values ('Ana', '🚀')$$,
  'edição gravada'
);

select * from finish();
rollback;
