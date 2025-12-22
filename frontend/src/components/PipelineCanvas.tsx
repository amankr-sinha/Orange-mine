import * as React from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
  type MiniMapNodeProps,
} from "reactflow"

import "reactflow/dist/style.css"

import { usePipelineStore } from "@/lib/pipelineStore"
import { DataUploadNode, ModelNode, PreprocessingNode, ResultsNode, TrainTestSplitNode } from "@/components/nodes"

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
  const isExecuting = usePipelineStore((s) => s.isExecuting)

  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const [rf, setRf] = React.useState<ReactFlowInstance | null>(null)

  const MiniMapNode = React.useCallback(
    (props: MiniMapNodeProps) => {
      const node = nodes.find((n) => n.id === props.id)
      const t = node?.type as Kind | undefined

      const label =
        t === "dataUpload"
          ? "D"
          : t === "preprocessing"
            ? "P"
            : t === "trainTestSplit"
              ? "S"
              : t === "model"
                ? "M"
                : t === "results"
                  ? "R"
                  : ""

      // Use a circular marker + a single-letter glyph (fast + reliable in SVG)
      // (True SVG icons are possible, but this keeps minimap crisp and consistent.)
      const r = Math.max(6, Math.min(props.width, props.height) / 2)

      return (
        <g transform={`translate(${props.x}, ${props.y})`}>
          <circle
            cx={props.width / 2}
            cy={props.height / 2}
            r={r}
            fill={props.color}
            stroke={props.strokeColor}
            strokeWidth={props.strokeWidth}
            opacity={0.95}
          />
          <text
            x={props.width / 2}
            y={props.height / 2 + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(0,0,0,0.72)"
            fontSize={Math.max(7, r)}
            fontWeight={700}
            style={{ userSelect: "none" }}
          >
            {label}
          </text>
        </g>
      )
    },
    [nodes]
  )

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

  return (
    <div ref={wrapperRef} className="h-full w-full">
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
        onPaneClick={() => setSelectedNodeId(undefined)}
        fitView
      >
        <Background gap={20} size={1} color="rgba(255,255,255,0.08)" />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeBorderRadius={10}
          maskColor="rgba(0,0,0,0.35)"
          nodeStrokeWidth={2}
          nodeComponent={MiniMapNode}
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
      </ReactFlow>
    </div>
  )
}
