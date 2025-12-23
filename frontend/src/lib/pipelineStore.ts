import { create } from "zustand"
import type { Edge, Node, XYPosition } from "reactflow"

import { api, getErrorMessage } from "@/lib/api"

type NodeKind = "dataUpload" | "preprocessing" | "trainTestSplit" | "model" | "results"

type DatasetInfo = {
  rows: number
  columns: number
  column_names: string[]
  dtypes: Record<string, string>
  preview: Record<string, unknown>[]
  preview_columns: string[]
}

type DataUploadConfig = {
  fileName?: string
  dataset_id?: string
  info?: DatasetInfo
}

type PreprocessingConfig = {
  standardization: boolean
  normalization: boolean
  columns: string[]
}

type TrainTestSplitConfig = {
  test_size: number
  random_state: number
}

type ModelConfig = {
  model_type: "logistic_regression" | "decision_tree"
  target_column?: string
  feature_columns: string[]
  hyperparameters: {
    max_iter?: number
    C?: number
    max_depth?: number
    min_samples_split?: number
    random_state?: number
  }
}

type ResultsConfig = {}

type NodeConfig =
  | { kind: "dataUpload"; config: DataUploadConfig }
  | { kind: "preprocessing"; config: PreprocessingConfig }
  | { kind: "trainTestSplit"; config: TrainTestSplitConfig }
  | { kind: "model"; config: ModelConfig }
  | { kind: "results"; config: ResultsConfig }

export type PipelineNodeData = {
  kind: NodeKind
  label: string
}

export type PipelineNode = Node<PipelineNodeData>
export type PipelineEdge = Edge

type ExecutionSnapshot = {
  execution_id: string
  status: string
  message?: string
  node_status: Record<string, string>
  results_per_node: Record<string, unknown>
}

type PipelineState = {
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  configs: Record<string, NodeConfig>
  undo: Record<string, unknown | null>
  selectedNodeId?: string

  isExecuting: boolean
  executionId?: string
  nodeStatus: Record<string, string>
  resultsPerNode: Record<string, unknown>
  executionStatus?: string
  executionMessage?: string

  setSelectedNodeId: (id?: string) => void
  setNodes: (nodes: PipelineNode[]) => void
  setEdges: (edges: PipelineEdge[]) => void

  deleteNode: (nodeId: string) => void
  disconnectNode: (nodeId: string) => void
  resetPipeline: () => void

  addNode: (kind: NodeKind, position: XYPosition) => void
  updateNodeConfig: (nodeId: string, patch: unknown) => void
  replaceNodeConfig: (nodeId: string, nextConfig: unknown) => void
  takeUndoSnapshot: (nodeId: string) => void
  undoLastApply: (nodeId: string) => void

  uploadDataset: (nodeId: string, file: File) => Promise<void>
  loadSampleDataset: (nodeId: string, filename: string) => Promise<void>

  runPipeline: () => Promise<void>
  stopPipeline: () => Promise<void>
  pollExecutionOnce: () => Promise<void>
}

function defaultConfig(kind: NodeKind): NodeConfig {
  switch (kind) {
    case "dataUpload":
      return { kind, config: {} }
    case "preprocessing":
      return { kind, config: { standardization: false, normalization: false, columns: [] } }
    case "trainTestSplit":
      return { kind, config: { test_size: 0.2, random_state: 42 } }
    case "model":
      return {
        kind,
        config: {
          model_type: "logistic_regression",
          feature_columns: [],
          hyperparameters: { max_iter: 200, C: 1.0 },
        },
      }
    case "results":
      return { kind, config: {} }
  }
}

function labelFor(kind: NodeKind): string {
  switch (kind) {
    case "dataUpload":
      return "CSV / Excel Import"
    case "preprocessing":
      return "Preprocessing"
    case "trainTestSplit":
      return "Train / Test Split"
    case "model":
      return "Model"
    case "results":
      return "Results"
  }
}

function makeBackendNodePayload(node: PipelineNode, cfg: NodeConfig) {
  if (cfg.kind === "dataUpload") {
    return { id: node.id, type: node.data.kind, config: { dataset_id: cfg.config.dataset_id } }
  }
  if (cfg.kind === "preprocessing") {
    const ops = [] as Array<{ type: "standardization" | "normalization"; columns: string[] }>
    if (cfg.config.standardization) ops.push({ type: "standardization", columns: cfg.config.columns })
    if (cfg.config.normalization) ops.push({ type: "normalization", columns: cfg.config.columns })
    return { id: node.id, type: node.data.kind, config: { operations: ops } }
  }
  if (cfg.kind === "trainTestSplit") {
    return { id: node.id, type: node.data.kind, config: { test_size: cfg.config.test_size, random_state: cfg.config.random_state } }
  }
  if (cfg.kind === "model") {
    return {
      id: node.id,
      type: node.data.kind,
      config: {
        model_type: cfg.config.model_type,
        target_column: cfg.config.target_column,
        feature_columns: cfg.config.feature_columns,
        hyperparameters: cfg.config.hyperparameters,
      },
    }
  }
  return { id: node.id, type: node.data.kind, config: {} }
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  nodes: [],
  edges: [],
  configs: {},
  undo: {},
  selectedNodeId: undefined,

  isExecuting: false,
  executionId: undefined,
  nodeStatus: {},
  resultsPerNode: {},
  executionStatus: undefined,
  executionMessage: undefined,

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  deleteNode: (nodeId) => {
    set((s) => {
      const nodes = s.nodes.filter((n) => n.id !== nodeId)
      const edges = s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)

      const nextConfigs = { ...s.configs }
      delete nextConfigs[nodeId]

      const nextUndo = { ...s.undo }
      delete nextUndo[nodeId]

      return {
        nodes,
        edges,
        configs: nextConfigs,
        undo: nextUndo,
        selectedNodeId: s.selectedNodeId === nodeId ? undefined : s.selectedNodeId,
      }
    })
  },

  disconnectNode: (nodeId) => {
    set((s) => ({ edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId) }))
  },

  resetPipeline: () => {
    set({
      nodes: [],
      edges: [],
      configs: {},
      undo: {},
      selectedNodeId: undefined,
      isExecuting: false,
      executionId: undefined,
      nodeStatus: {},
      resultsPerNode: {},
      executionStatus: undefined,
      executionMessage: undefined,
    })
  },

  addNode: (kind, position) => {
    const id = crypto.randomUUID()
    const node: PipelineNode = {
      id,
      type: kind,
      position,
      data: { kind, label: labelFor(kind) },
    }

    set((s) => ({
      nodes: [...s.nodes, node],
      configs: { ...s.configs, [id]: defaultConfig(kind) },
      undo: { ...s.undo, [id]: null },
    }))
  },

  updateNodeConfig: (nodeId, patch) => {
    set((s) => {
      const existing = s.configs[nodeId]
      if (!existing) return s

      const next = structuredClone(existing) as NodeConfig
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.assign((next as any).config, patch as any)

      return { configs: { ...s.configs, [nodeId]: next } }
    })
  },

  replaceNodeConfig: (nodeId, nextConfig) => {
    set((s) => {
      const existing = s.configs[nodeId]
      if (!existing) return s
      const next = structuredClone(existing) as NodeConfig
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(next as any).config = structuredClone(nextConfig as any)
      return { configs: { ...s.configs, [nodeId]: next } }
    })
  },

  takeUndoSnapshot: (nodeId) => {
    set((s) => {
      const existing = s.configs[nodeId]
      if (!existing) return s
      return { undo: { ...s.undo, [nodeId]: structuredClone(existing.config) } }
    })
  },

  undoLastApply: (nodeId) => {
    const snapshot = get().undo[nodeId]
    if (!snapshot) return
    get().replaceNodeConfig(nodeId, snapshot)
    set((s) => ({ undo: { ...s.undo, [nodeId]: null } }))
  },

  uploadDataset: async (nodeId, file) => {
    const fd = new FormData()
    fd.append("file", file)

    const res = await api.post("/api/data/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    const dataset_id = res.data.dataset_id as string
    const info = res.data.info as DatasetInfo

    get().updateNodeConfig(nodeId, { fileName: file.name, dataset_id, info })
  },

  loadSampleDataset: async (nodeId, filename) => {
    const res = await api.post("/api/data/samples/load", { filename })

    const dataset_id = res.data.dataset_id as string
    const info = res.data.info as DatasetInfo
    const fileName = (res.data.fileName as string | undefined) ?? filename

    get().updateNodeConfig(nodeId, { fileName, dataset_id, info })
  },

  runPipeline: async () => {
    const { nodes, edges, configs } = get()

    if (!nodes.length) throw new Error("Add nodes to the canvas first")

    const payloadNodes = nodes.map((n) => {
      const cfg = configs[n.id]
      if (!cfg) return { id: n.id, type: n.data.kind, config: {} }
      return makeBackendNodePayload(n, cfg)
    })

    set({
      isExecuting: true,
      executionId: undefined,
      nodeStatus: {},
      resultsPerNode: {},
      executionStatus: "queued",
      executionMessage: undefined,
    })

    try {
      const res = await api.post("/api/pipeline/execute", {
        nodes: payloadNodes,
        connections: edges.map((e) => ({ source: e.source, target: e.target })),
      })

      set({ executionId: res.data.execution_id as string })
      await get().pollExecutionOnce()
    } catch (err) {
      set({ isExecuting: false })
      throw new Error(getErrorMessage(err))
    }
  },

  stopPipeline: async () => {
    const executionId = get().executionId
    if (!executionId) return

    try {
      await api.post(`/api/pipeline/${executionId}/cancel`)
    } finally {
      // Optimistically unlock the UI; any final status can still be viewed from the last snapshot.
      set({ isExecuting: false, executionStatus: "cancelled" })
    }
  },

  pollExecutionOnce: async () => {
    const executionId = get().executionId
    if (!executionId) return

    const res = await api.get(`/api/pipeline/${executionId}/status`)
    const snap = res.data as ExecutionSnapshot

    set({
      nodeStatus: snap.node_status || {},
      resultsPerNode: snap.results_per_node || {},
      isExecuting: snap.status === "running" || snap.status === "queued",
      executionStatus: snap.status,
      executionMessage: snap.message,
    })
  },
}))
