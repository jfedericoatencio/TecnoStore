'use client';
// Notificaciones flotantes minimalistas
import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let listeners: ((t: Toast) => void)[] = [];
let seq = 1;

export function toast(message: string, type: ToastType = 'info') {
  const t = { id: seq++, message, type };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast) => {
      setToasts((prev) => [...prev.slice(-3), t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3500);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition ${
            t.type === 'success'
              ? 'bg-emerald-600'
              : t.type === 'error'
                ? 'bg-red-600'
                : 'bg-slate-800'
          }`}
        >
          {t.type === 'success' ? '✓ ' : t.type === 'error' ? '⚠ ' : ''}
          {t.message}
        </div>
      ))}
    </div>
  );
}
