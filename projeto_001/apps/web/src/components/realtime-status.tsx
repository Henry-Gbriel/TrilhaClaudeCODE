'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { createClient } from '@/lib/supabase/client';

type Status = 'conectando' | 'conectado' | 'nao-autorizado' | 'offline';

const LABELS: Record<Status, string> = {
  conectando: 'Conectando ao servidor…',
  conectado: 'Conectado ao servidor',
  'nao-autorizado': 'O servidor recusou o login. Saia e entre de novo.',
  offline: 'Servidor de jogo indisponível',
};

const COLORS: Record<Status, string> = {
  conectando: 'bg-amber-400',
  conectado: 'bg-emerald-500',
  'nao-autorizado': 'bg-red-500',
  offline: 'bg-zinc-400',
};

/** Conecta no realtime com o access_token da sessão, para mostrar que o servidor aceita o login. */
export function RealtimeStatus() {
  const [status, setStatus] = useState<Status>('conectando');

  useEffect(() => {
    const supabase = createClient();
    const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL ?? 'http://localhost:4000', {
      // Função: a cada (re)conexão pega o token atual, que o Supabase renova sozinho.
      auth: (cb) => {
        void supabase.auth.getSession().then(({ data }) => {
          cb({ token: data.session?.access_token ?? '' });
        });
      },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setStatus('conectado');
    });
    socket.on('disconnect', () => {
      setStatus('offline');
    });
    socket.on('connect_error', (err) => {
      if (err.message === 'UNAUTHORIZED') {
        setStatus('nao-autorizado');
        socket.disconnect();
      } else {
        setStatus('offline');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <p className="text-muted-foreground flex items-center gap-2 text-sm" aria-live="polite">
      <span className={`size-2 rounded-full ${COLORS[status]}`} aria-hidden />
      {LABELS[status]}
    </p>
  );
}
