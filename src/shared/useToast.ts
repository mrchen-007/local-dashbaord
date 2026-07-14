import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

let toasts: ToastItem[] = [];
let listeners: Array<(toasts: ToastItem[]) => void> = [];

function notify() {
  const snapshot = [...toasts];
  listeners.forEach((listener) => listener(snapshot));
}

export function addToast(type: ToastType, message: string): string {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  toasts = [...toasts, { id, type, message }];
  notify();
  return id;
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function useToastItems(): ToastItem[] {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    listeners.push(setItems);
    setItems([...toasts]);
    return () => {
      listeners = listeners.filter((l) => l !== setItems);
    };
  }, []);
  return items;
}

export function useToast(): { toast: (type: string, message: string) => void } {
  return {
    toast: (type: string, message: string) => {
      const validTypes: ToastType[] = ['success', 'error', 'warning', 'info'];
      const toastType = validTypes.includes(type as ToastType) ? (type as ToastType) : 'info';
      addToast(toastType, message);
    },
  };
}
