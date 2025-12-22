import * as React from "react"
import { Database, Wand2, SplitSquareVertical, Brain, BarChart3, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type PaletteItem = {
  kind: "dataUpload" | "preprocessing" | "trainTestSplit" | "model" | "results"
  title: string
  description: string
  icon: React.ReactNode
}

const items = {
  data: [
    {
      kind: "dataUpload",
      title: "CSV / Excel Import",
      description: "Upload a dataset (.csv, .xlsx, .xls).",
      icon: <Database className="h-4 w-4" />,
    },
  ] satisfies PaletteItem[],
  transform: [
    {
      kind: "preprocessing",
      title: "Preprocessing",
      description: "Standardize/normalize selected columns.",
      icon: <Wand2 className="h-4 w-4" />,
    },
    {
      kind: "trainTestSplit",
      title: "Train / Test Split",
      description: "Split data into train and test sets.",
      icon: <SplitSquareVertical className="h-4 w-4" />,
    },
  ] satisfies PaletteItem[],
  model: [
    {
      kind: "model",
      title: "Model",
      description: "Train Logistic Regression or Decision Tree.",
      icon: <Brain className="h-4 w-4" />,
    },
  ] satisfies PaletteItem[],
  evaluate: [
    {
      kind: "results",
      title: "Results",
      description: "Accuracy, confusion matrix, reports.",
      icon: <BarChart3 className="h-4 w-4" />,
    },
  ] satisfies PaletteItem[],
}

function Draggable({ item, collapsed }: { item: PaletteItem; collapsed: boolean }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow", item.kind)
    event.dataTransfer.effectAllowed = "move"
  }

  const iconClass =
    item.kind === "dataUpload"
      ? "flow-icon flow-icon--data"
      : item.kind === "preprocessing" || item.kind === "trainTestSplit"
        ? "flow-icon flow-icon--transform"
        : item.kind === "model"
          ? "flow-icon flow-icon--model"
          : "flow-icon flow-icon--evaluate"

  const content = (
    <Card
      draggable
      onDragStart={onDragStart}
      className={
        "smooth cursor-grab select-none hover:-translate-y-0.5 hover:bg-muted/30 " +
        (collapsed ? "rounded-xl border-0 bg-transparent p-1 shadow-none" : "p-2")
      }
    >
      <div className={"flex items-center " + (collapsed ? "justify-center" : "gap-2")}>
        {collapsed ? (
          <div className={"grid h-9 w-9 place-items-center rounded-full text-white " + iconClass}>{item.icon}</div>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={"grid h-9 w-9 place-items-center rounded-full text-white " + iconClass}>{item.icon}</div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {collapsed ? null : (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{item.title}</div>
            <div className="truncate text-xs text-muted-foreground">{item.description}</div>
          </div>
        )}
      </div>
    </Card>
  )

  if (!collapsed) return content

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>{item.title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (collapsed) return

    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current
      if (!el) return
      if (el.contains(e.target as Node)) return
      setCollapsed(true)
    }

    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [collapsed])

  return (
    <div
      ref={rootRef}
      className={(collapsed ? "w-16" : "w-80") + " shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"}
    >
      <div className="glass smooth flex h-full flex-col border-r">
        <div className="flex items-center justify-between px-3 py-3">
          {collapsed ? null : <div className="text-sm font-semibold">Nodes</div>}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <Separator />

        <div className="flex-1 space-y-5 overflow-auto p-3">
          <div className="space-y-2">
            {collapsed ? null : <div className="text-xs font-semibold text-muted-foreground">Data</div>}
            <div className="space-y-2">
              {items.data.map((i) => (
                <Draggable key={i.kind} item={i} collapsed={collapsed} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {collapsed ? null : <div className="text-xs font-semibold text-muted-foreground">Transform</div>}
            <div className="space-y-2">
              {items.transform.map((i) => (
                <Draggable key={i.kind} item={i} collapsed={collapsed} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {collapsed ? null : <div className="text-xs font-semibold text-muted-foreground">Model</div>}
            <div className="space-y-2">
              {items.model.map((i) => (
                <Draggable key={i.kind} item={i} collapsed={collapsed} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {collapsed ? null : <div className="text-xs font-semibold text-muted-foreground">Evaluate</div>}
            <div className="space-y-2">
              {items.evaluate.map((i) => (
                <Draggable key={i.kind} item={i} collapsed={collapsed} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
