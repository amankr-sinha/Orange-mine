import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function ToastHost() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map((t) => (
        <Toast key={t.id} variant={t.variant} open onOpenChange={(open) => !open && dismiss(t.id)}>
          <div className="grid gap-1">
            {t.title ? <ToastTitle>{t.title}</ToastTitle> : null}
            {t.description ? <ToastDescription>{t.description}</ToastDescription> : null}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
