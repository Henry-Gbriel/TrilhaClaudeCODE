import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Perfil · DevQuiz Arena' };

export default function ProfilePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Seu perfil</h1>
      <Suspense fallback={<p className="text-muted-foreground">Carregando…</p>}>
        <CurrentProfile />
      </Suspense>
    </main>
  );
}

async function CurrentProfile() {
  const user = await getCurrentUser();
  return <ProfileForm displayName={user.displayName} avatarEmoji={user.avatarEmoji} />;
}
