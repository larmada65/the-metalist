'use client'
import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; type: ToastType }
type ToastCtx = { show: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastCtx>({ show: () => {} })

let _id = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 z-[9998] flex flex-col gap-2 items-center md:items-start pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl animate-slide-up max-w-sm ${
              t.type === 'success' ? 'bg-zinc-950 border-green-800/70 text-green-400'
              : t.type === 'error'  ? 'bg-zinc-950 border-red-800/70 text-red-400'
              : 'bg-zinc-950 border-zinc-700 text-zinc-200'
            }`}>
            {t.type === 'success' && (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {t.type === 'error' && (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const { show } = useContext(ToastContext)
  return {
    success: (msg: string) => show(msg, 'success'),
    error:   (msg: string) => show(msg, 'error'),
    info:    (msg: string) => show(msg, 'info'),
  }
}
