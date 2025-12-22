import * as React from "react"

import { useToast } from "@/components/ui/use-toast"
import { usePipelineStore } from "@/lib/pipelineStore"

export function ExecutionToasts() {
  const { push } = useToast()
  const status = usePipelineStore((s) => s.executionStatus)
  const message = usePipelineStore((s) => s.executionMessage)

  const prev = React.useRef<string | undefined>(undefined)

  React.useEffect(() => {
    if (!status || prev.current === status) return

    if (status === "success") {
      push({ title: "Done", description: "Pipeline completed successfully.", variant: "success" })
    } else if (status === "error") {
      push({ title: "Pipeline error", description: message || "Execution failed.", variant: "destructive" })
    } else if (status === "cancelled") {
      push({ title: "Cancelled", description: "Pipeline execution cancelled.", variant: "success" })
    }

    prev.current = status
  }, [status, message, push])

  return null
}
