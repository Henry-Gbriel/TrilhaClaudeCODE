-- questions: nenhum acesso para anon/authenticated; só o servidor (service_role) lê.
begin;
select plan(7);

insert into public.questions (slug, type, category, difficulty, prompt, options, correct, explanation, status)
values ('tst-001', 'true_false', 'IA', 'facil', 'Pergunta de teste', '[{"id":"a","text":"V"},{"id":"b","text":"F"}]', '["a"]', 'Porque sim.', 'published');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.questions'::regclass),
  'questions tem RLS ligado'
);

set local role anon;
select throws_ok('select * from public.questions', '42501', null, 'anon não lê questions');
select throws_ok(
  $$insert into public.questions (slug, type, category, difficulty, prompt, options, correct, explanation)
    values ('tst-002', 'true_false', 'IA', 'facil', 'x', '[]', '[]', 'x')$$,
  '42501', null, 'anon não escreve em questions'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok('select * from public.questions', '42501', null, 'authenticated não lê questions');
select throws_ok($$update public.questions set prompt = 'x'$$, '42501', null, 'authenticated não edita questions');
select throws_ok($$delete from public.questions$$, '42501', null, 'authenticated não apaga questions');
reset role;

set local role service_role;
select is((select count(*) from public.questions where slug = 'tst-001'), 1::bigint, 'service_role lê questions');
reset role;

select * from finish();
rollback;
