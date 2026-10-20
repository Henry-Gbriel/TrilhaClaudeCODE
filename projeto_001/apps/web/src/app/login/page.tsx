import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { signInWithProvider } from '@/app/auth/actions';

export const metadata: Metadata = { title: 'Entrar · DevQuiz Arena' };

const ERRORS: Record<string, string> = {
  callback: 'Não foi possível concluir o login. Tente de novo.',
  oauth: 'O provedor de login recusou a solicitação. Tente de novo.',
  provedor: 'Provedor de login inválido.',
};

export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">DevQuiz Arena</h1>
        <p className="text-muted-foreground max-w-sm">
          Quiz em tempo real sobre IA, ferramentas de workflow e programação.
        </p>
      </div>
      <Suspense>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginForm({ searchParams }: Pick<PageProps<'/login'>, 'searchParams'>) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '/';
  const error = typeof params.erro === 'string' ? (ERRORS[params.erro] ?? ERRORS.callback) : null;

  return (
    <form action={signInWithProvider} className="flex w-full max-w-xs flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      {error && (
        <p role="alert" className="text-destructive text-center text-sm">
          {error}
        </p>
      )}
      <Button type="submit" name="provider" value="github" size="lg">
        Entrar com GitHub
      </Button>
      <Button type="submit" name="provider" value="google" size="lg" variant="outline">
        Entrar com Google
      </Button>
    </form>
  );
}
