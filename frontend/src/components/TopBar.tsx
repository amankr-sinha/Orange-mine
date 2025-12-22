import { Play, RotateCcw, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { usePipelineStore } from "@/lib/pipelineStore"

export function TopBar() {
  const { push } = useToast()
  const isExecuting = usePipelineStore((s) => s.isExecuting)
  const runPipeline = usePipelineStore((s) => s.runPipeline)
  const stopPipeline = usePipelineStore((s) => s.stopPipeline)
  const resetPipeline = usePipelineStore((s) => s.resetPipeline)

  const onRun = async () => {
    try {
      await runPipeline()
      push({ title: "Started", description: "Pipeline execution started.", variant: "success" })
    } catch (e) {
      push({ title: "Error", description: e instanceof Error ? e.message : "Failed to start", variant: "destructive" })
    }
  }

  return (
    <div className="smooth flex items-center justify-between border-b border-orange-950/40 bg-gradient-to-r from-orange-950 via-orange-600 to-orange-800 px-4 py-2">
      <h1 className="text-lg font-bold tracking-tight ml-4">
        <span className="text-orange-300">O</span>
        <span className="text-white">range Mine</span>
        <img src="/mining.png" alt="Mining Icon" className="ml-2 inline-block h-4 w-4 align-[-2px]" />
      </h1>
      <div className="flex gap-2">
        <Button onClick={onRun} disabled={isExecuting}>
          <Play className="mr-2 h-4 w-4" /> Run Pipeline
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            resetPipeline()
            push({ title: "Reset", description: "Pipeline cleared.", variant: "success" })
          }}
          disabled={isExecuting}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Reset
        </Button>
        {isExecuting ? (
          <Button variant="outline" onClick={() => void stopPipeline()}>
            <Square className="mr-2 h-4 w-4" /> Stop
          </Button>
        ) : null}
      </div>
    </div>
  )
}
