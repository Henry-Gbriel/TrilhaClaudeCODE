-- M3: perfil criado automaticamente no signup (RF-02) e edição restrita a nome e avatar.

alter table public.profiles
  add constraint profiles_display_name_length check (char_length(display_name) between 1 and 24);

-- Nome inicial: o que o provedor OAuth mandar (Google: full_name/name; GitHub: name/user_name),
-- senão a parte do e-mail antes do @, senão 'Jogador'. Truncado ao limite da coluna.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text;
begin
  name := coalesce(
    nullif(btrim(meta ->> 'full_name'), ''),
    nullif(btrim(meta ->> 'name'), ''),
    nullif(btrim(meta ->> 'user_name'), ''),
    nullif(btrim(split_part(new.email, '@', 1)), ''),
    'Jogador'
  );
  insert into public.profiles (id, display_name) values (new.id, left(name, 24));
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- O usuário só edita nome e avatar do próprio perfil (a policy de update limita as linhas).
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_emoji) on public.profiles to authenticated;
