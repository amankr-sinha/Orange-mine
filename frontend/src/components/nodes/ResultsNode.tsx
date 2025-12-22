import { BarChart3, CheckCircle2, Loader2, XCircle } from "lucide-react"
import type { NodeProps } from "reactflow"
import { Handle, Position } from "reactflow"

import { cn } from "@/lib/utils"
import { usePipelineStore } from "@/lib/pipelineStore"

export function ResultsNode({ id, data, selected }: NodeProps<{ kind: string; label: string }>) {
  const status = usePipelineStore((s) => s.nodeStatus[id])
  const result = usePipelineStore((s) => s.resultsPerNode[id]) as any
  const accuracy = result?.metrics?.accuracy

  return (
    <div
      className={cn(
        "rounded-xl border bg-background px-4 py-3",
        status === "error" && "border-destructive",
        selected && "ring-2 ring-ring"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[#8B5CF6] text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          {status ? (
            <div className="absolute -right-1 -top-1 rounded-full bg-background">
              {status === "running" ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : status === "error" ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium leading-tight">{data.label}</div>
          <div className="text-xs text-muted-foreground">
            {typeof accuracy === "number" ? `Accuracy: ${(accuracy * 100).toFixed(1)}%` : "Evaluation"}
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="!h-3 !w-3" />
    </div>
  )
}
