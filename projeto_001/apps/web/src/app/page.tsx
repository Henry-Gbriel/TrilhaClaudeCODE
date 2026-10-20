import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { RealtimeStatus } from '@/components/realtime-status';
import { signOut } from '@/app/auth/actions';
import { getCurrentUser } from '@/lib/auth';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">DevQuiz Arena</h1>
      <Suspense fallback={<p className="text-muted-foreground">Carregando…</p>}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-5xl" aria-hidden>
        {user.avatarEmoji}
      </p>
      <p className="text-xl">
        Olá, <strong>{user.displayName}</strong>!
      </p>
      <RealtimeStatus />
      <div className="flex gap-2">
        <Link
          href="/perfil"
          className="border-border hover:bg-muted inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-medium"
        >
          Editar perfil
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}
