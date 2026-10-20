'use client';

import { AVATAR_EMOJIS, DISPLAY_NAME_MAX } from '@devquiz/shared';
import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { type ProfileFormState, updateProfile } from './actions';

const initialState: ProfileFormState = { error: null };

export function ProfileForm({
  displayName,
  avatarEmoji,
}: {
  displayName: string;
  avatarEmoji: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-6">
      <label className="flex flex-col gap-2 text-left">
        <span className="text-sm font-medium">Nome de exibição</span>
        <input
          name="displayName"
          defaultValue={displayName}
          required
          maxLength={DISPLAY_NAME_MAX}
          className="border-input focus-visible:ring-ring/50 h-9 rounded-lg border bg-transparent px-3 outline-none focus-visible:ring-3"
        />
      </label>

      <fieldset className="flex flex-col gap-2 text-left">
        <legend className="mb-2 text-sm font-medium">Avatar</legend>
        <div className="grid grid-cols-8 gap-2">
          {AVATAR_EMOJIS.map((emoji) => (
            <label key={emoji} className="cursor-pointer">
              <input
                type="radio"
                name="avatarEmoji"
                value={emoji}
                defaultChecked={emoji === avatarEmoji}
                className="peer sr-only"
              />
              <span className="peer-checked:border-primary peer-checked:bg-muted peer-focus-visible:ring-ring/50 flex aspect-square items-center justify-center rounded-lg border border-transparent text-2xl peer-focus-visible:ring-3">
                {emoji}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Link
          href="/"
          className="hover:bg-muted inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-medium"
        >
          Cancelar
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
