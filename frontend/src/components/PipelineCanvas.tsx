import * as React from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from "reactflow"

import "reactflow/dist/style.css"

import { usePipelineStore } from "@/lib/pipelineStore"
import { DataUploadNode, ModelNode, PreprocessingNode, ResultsNode, TrainTestSplitNode } from "@/components/nodes"
import { Card } from "@/components/ui/card"

const nodeTypes = {
  dataUpload: DataUploadNode,
  preprocessing: PreprocessingNode,
  trainTestSplit: TrainTestSplitNode,
  model: ModelNode,
  results: ResultsNode,
}

type Kind = keyof typeof nodeTypes

const rank: Record<Kind, number> = {
  dataUpload: 0,
  preprocessing: 1,
  trainTestSplit: 2,
  model: 3,
  results: 4,
}

function isValidConnection(connection: Connection, nodes: { id: string; type?: string }[]) {
  const src = nodes.find((n) => n.id === connection.source)
  const tgt = nodes.find((n) => n.id === connection.target)
  const srcType = src?.type as Kind | undefined
  const tgtType = tgt?.type as Kind | undefined

  if (!srcType || !tgtType) return false

  // Enforce strict order: Data → Preprocessing → Split → Model → Results
  const allowed: Record<Kind, Kind | null> = {
    dataUpload: "preprocessing",
    preprocessing: "trainTestSplit",
    trainTestSplit: "model",
    model: "results",
    results: null,
  }

  return allowed[srcType] === tgtType && rank[srcType] < rank[tgtType]
}

export function PipelineCanvas() {
  const nodes = usePipelineStore((s) => s.nodes)
  const edges = usePipelineStore((s) => s.edges)
  const setNodes = usePipelineStore((s) => s.setNodes)
  const setEdges = usePipelineStore((s) => s.setEdges)
  const addNode = usePipelineStore((s) => s.addNode)
  const setSelectedNodeId = usePipelineStore((s) => s.setSelectedNodeId)
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId)
  const isExecuting = usePipelineStore((s) => s.isExecuting)
  const deleteNode = usePipelineStore((s) => s.deleteNode)
  const disconnectNode = usePipelineStore((s) => s.disconnectNode)

  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const [rf, setRf] = React.useState<ReactFlowInstance | null>(null)

  const [contextMenu, setContextMenu] = React.useState<null | { nodeId: string; x: number; y: number }>(null)

  const closeContextMenu = React.useCallback(() => setContextMenu(null), [])

  React.useEffect(() => {
    if (!contextMenu) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [contextMenu, closeContextMenu])

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isExecuting) return
      if (!selectedNodeId) return

      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      const isTypingTarget =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (target?.getAttribute?.("role") === "textbox") ||
        target?.isContentEditable

      if (isTypingTarget) return

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault()
        deleteNode(selectedNodeId)
        closeContextMenu()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isExecuting, selectedNodeId, deleteNode, closeContextMenu])

  const onNodesChange = React.useCallback(
    (changes: NodeChange[]) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes, setNodes]
  )

  const onEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges]
  )

  const onConnect = React.useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection, nodes)) return
      setEdges(addEdge({ ...connection, animated: isExecuting }, edges))
    },
    [edges, nodes, setEdges, isExecuting]
  )

  const onDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const kind = event.dataTransfer.getData("application/reactflow") as Kind
      if (!kind || !rf || !wrapperRef.current) return

      const bounds = wrapperRef.current.getBoundingClientRect()
      const position = rf.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })

      addNode(kind, position)
    },
    [rf, addNode]
  )

  const onNodeContextMenu = React.useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      event.preventDefault()
      event.stopPropagation()
      if (isExecuting) return

      const padding = 8
      const menuWidth = 220
      const menuHeight = 92
      const maxX = Math.max(padding, window.innerWidth - menuWidth - padding)
      const maxY = Math.max(padding, window.innerHeight - menuHeight - padding)

      setContextMenu({
        nodeId: node.id,
        x: Math.min(event.clientX, maxX),
        y: Math.min(event.clientY, maxY),
      })
    },
    [isExecuting]
  )

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges.map((e) => ({ ...e, animated: isExecuting }))}
        nodeTypes={nodeTypes}
        nodesDraggable={isExecuting ? false : undefined}
        nodesConnectable={isExecuting ? false : undefined}
        elementsSelectable={isExecuting ? false : undefined}
        onInit={setRf}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={() => setSelectedNodeId(undefined)}
        onPaneContextMenu={(e) => {
          e.preventDefault()
          closeContextMenu()
        }}
        fitView
      >
        <Background variant="dots" gap={18} size={1.6} color="rgba(255,255,255,0.14)" />
        <Controls />

        <Panel position="bottom-right" className="!m-4 z-10">
          <MiniMap
            pannable
            zoomable
            nodeBorderRadius={10}
            maskColor="rgba(0,0,0,0.35)"
            nodeStrokeWidth={2}
            nodeColor={(n) => {
              switch (n.type) {
                case "dataUpload":
                  return "#F4A261"
                case "preprocessing":
                case "trainTestSplit":
                  return "#2A9D8F"
                case "model":
                  return "#E76F51"
                case "results":
                  return "#8B5CF6"
                default:
                  return "rgba(255,255,255,0.25)"
              }
            }}
            nodeStrokeColor={() => "rgba(255,255,255,0.22)"}
            className="smooth"
          />
        </Panel>
      </ReactFlow>

      {!nodes.length ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Card className="glass smooth border px-4 py-3 text-center">
            <div className="text-sm font-semibold">Drag and Drop Nodes to Begin!</div>
            <div className="mt-1 text-xs text-muted-foreground">Use the left sidebar to add nodes.</div>
          </Card>
        </div>
      ) : null}

      {contextMenu ? (
        <div
          className="fixed inset-0 z-50"
          onPointerDown={() => closeContextMenu()}
          onContextMenu={(e) => {
            e.preventDefault()
            closeContextMenu()
          }}
        >
          <div
            className="absolute w-[220px] rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="smooth w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                deleteNode(contextMenu.nodeId)
                closeContextMenu()
              }}
            >
              Delete <span className="text-xs text-muted-foreground">(Backspace)</span>
            </button>
            <button
              type="button"
              className="smooth w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                disconnectNode(contextMenu.nodeId)
                closeContextMenu()
              }}
            >
              Disconnect node
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
