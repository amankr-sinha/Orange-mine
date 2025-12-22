import { SplitSquareVertical, CheckCircle2, Loader2, XCircle } from "lucide-react"
import type { NodeProps } from "reactflow"
import { Handle, Position } from "reactflow"

import { cn } from "@/lib/utils"
import { usePipelineStore } from "@/lib/pipelineStore"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function TrainTestSplitNode({ id, data, selected }: NodeProps<{ kind: string; label: string }>) {
  const status = usePipelineStore((s) => s.nodeStatus[id])
  const cfg = usePipelineStore((s) => (s.configs as any)[id]) as any
  const testSize = cfg?.config?.test_size as number | undefined
  const randomState = cfg?.config?.random_state as number | undefined

  return (
    <div
      className={cn(
        "glass smooth rounded-xl border px-4 py-3 hover:-translate-y-0.5",
        status === "error" && "border-destructive",
        selected && "ring-2 ring-ring"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="nodrag pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-sky-600 text-white">
                  <SplitSquareVertical className="h-5 w-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm font-medium">{data.label}</div>
                <div className="text-xs text-muted-foreground">Test size: {typeof testSize === "number" ? testSize : "—"}</div>
                <div className="text-xs text-muted-foreground">Random state: {typeof randomState === "number" ? randomState : "—"}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
          <div className="text-xs text-muted-foreground">Train/test split</div>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="!h-3 !w-3" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3" />
    </div>
  )
}
