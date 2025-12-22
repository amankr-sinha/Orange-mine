import { Play, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { usePipelineStore } from "@/lib/pipelineStore"

export function TopBar() {
  const { push } = useToast()
  const isExecuting = usePipelineStore((s) => s.isExecuting)
  const runPipeline = usePipelineStore((s) => s.runPipeline)
  const stopPipeline = usePipelineStore((s) => s.stopPipeline)

  const onRun = async () => {
    try {
      await runPipeline()
      push({ title: "Started", description: "Pipeline execution started." })
    } catch (e) {
      push({ title: "Error", description: e instanceof Error ? e.message : "Failed to start", variant: "destructive" })
    }
  }

  return (
    <div className="glass smooth flex items-center justify-between border-b px-4 py-2">
      <div className="text-sm font-semibold tracking-tight">ML Pipeline Builder</div>
      <div className="flex gap-2">
        <Button onClick={onRun} disabled={isExecuting}>
          <Play className="mr-2 h-4 w-4" /> Run Pipeline
        </Button>
        <Button variant="outline" onClick={() => void stopPipeline()} disabled={!isExecuting}>
          <Square className="mr-2 h-4 w-4" /> Stop
        </Button>
      </div>
    </div>
  )
}
