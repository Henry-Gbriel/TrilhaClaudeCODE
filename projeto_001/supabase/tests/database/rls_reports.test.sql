-- question_reports: o usuário insere os próprios reports; leitura só pelo servidor.
begin;
select plan(5);

-- O trigger on_auth_user_created cria os perfis a partir do full_name.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com', '{"full_name":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@example.com', '{"full_name":"Bia"}');
insert into public.questions (id, slug, type, category, difficulty, prompt, options, correct, explanation)
values ('20000000-0000-0000-0000-000000000001', 'tst-001', 'true_false', 'IA', 'facil', 'x',
  '[{"id":"a","text":"V"},{"id":"b","text":"F"}]', '["a"]', 'x');

set local role anon;
select throws_ok(
  $$insert into public.question_reports (question_id, reason) values ('20000000-0000-0000-0000-000000000001', 'x')$$,
  '42501', null, 'anon não reporta'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$insert into public.question_reports (question_id, user_id, reason)
    values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Resposta errada')$$,
  'usuário cria o próprio report'
);
select throws_ok(
  $$insert into public.question_reports (question_id, user_id, reason)
    values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'x')$$,
  '42501', null, 'usuário não cria report em nome de outro'
);
select is_empty('select * from public.question_reports', 'usuário não lê reports, nem os próprios');
reset role;

select is((select count(*) from public.question_reports), 1::bigint, 'servidor lê o report criado');

select * from finish();
rollback;
