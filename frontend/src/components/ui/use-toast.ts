import * as React from "react"

type ToastVariant = "default" | "success" | "destructive"

export type ToastItem = {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

type ToastContextValue = {
  toasts: ToastItem[]
  push: (t: Omit<ToastItem, "id">) => void
  dismiss: (id: string) => void
  clear: () => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProviderState({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const push = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, ...t }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 4500)
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const clear = React.useCallback(() => setToasts([]), [])

  const value = React.useMemo(() => ({ toasts, push, dismiss, clear }), [toasts, push, dismiss, clear])

  return React.createElement(ToastContext.Provider, { value }, children)
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast must be used within ToastProviderState")
  }
  return ctx
}
