import * as React from "react"
import { Download, Loader2, X } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from "recharts"

import { InfoTip } from "@/components/InfoTip"
import { MultiSelect } from "@/components/MultiSelect"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { getErrorMessage, api } from "@/lib/api"
import { usePipelineStore } from "@/lib/pipelineStore"

function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function describeToRows(describe: any) {
  const mean = describe?.mean || {}
  const std = describe?.std || {}
  const cols = Object.keys(mean).slice(0, 8)
  return cols.map((c) => ({
    column: c,
    mean: mean[c],
    std: std[c],
  }))
}

export function NodeConfigPanel() {
  const { push } = useToast()

  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId)
  const config = usePipelineStore((s) => (selectedNodeId ? s.configs[selectedNodeId] : undefined))
  const updateNodeConfig = usePipelineStore((s) => s.updateNodeConfig)
  const replaceNodeConfig = usePipelineStore((s) => s.replaceNodeConfig)
  const takeUndoSnapshot = usePipelineStore((s) => s.takeUndoSnapshot)
  const undoLastApply = usePipelineStore((s) => s.undoLastApply)
  const setSelectedNodeId = usePipelineStore((s) => s.setSelectedNodeId)
  const uploadDataset = usePipelineStore((s) => s.uploadDataset)
  const isExecuting = usePipelineStore((s) => s.isExecuting)
  const resultsPerNode = usePipelineStore((s) => s.resultsPerNode)

  const allConfigs = usePipelineStore((s) => s.configs)

  const [draft, setDraft] = React.useState<any>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [previewStats, setPreviewStats] = React.useState<any>(null)

  React.useEffect(() => {
    setDraft(config ? structuredClone(config.config) : null)
    setFile(null)
    setPreviewStats(null)
  }, [selectedNodeId, config])

  const columnsFromData = React.useMemo(() => {
    const dataNode = Object.values(allConfigs).find((c) => c.kind === "dataUpload") as any
    return dataNode?.config?.info?.column_names || []
  }, [allConfigs])

  const isOpen = Boolean(selectedNodeId && config)

  const activeNodeId = selectedNodeId || ""

  if (!config) {
    // Keep a mounted panel shell for smooth slide animations
    return (
      <div className="smooth pointer-events-none fixed right-0 top-0 z-50 h-full w-[420px] translate-x-full opacity-0" />
    )
  }

  const panelTitle =
    config.kind === "dataUpload"
      ? "Data Upload"
      : config.kind === "preprocessing"
        ? "Preprocessing"
        : config.kind === "trainTestSplit"
          ? "Train / Test Split"
          : config.kind === "model"
            ? "Model"
            : "Results"

  const validationError = (() => {
    if (config.kind === "dataUpload") {
      const hasDataset = Boolean((config as any).config?.dataset_id)
      if (!hasDataset && !file) return "Upload a CSV/XLSX file first."
      return null
    }
    if (config.kind === "preprocessing") {
      const hasOp = Boolean(draft?.standardization || draft?.normalization)
      if (!hasOp) return "Select at least one preprocessing operation."
      if (!draft?.columns?.length) return "Select at least one column."
      return null
    }
    if (config.kind === "model") {
      if (!draft?.target_column) return "Select a target column."
      if (!draft?.feature_columns?.length) return "Select at least one feature column."
      return null
    }
    return null
  })()

  const onCancel = () => {
    // Undo last Apply if present; otherwise just reset unsaved edits.
    undoLastApply(activeNodeId)

    const afterUndoConfig = usePipelineStore.getState().configs[activeNodeId]?.config
    setDraft(structuredClone(afterUndoConfig ?? config.config))
    setFile(null)
    setPreviewStats(null)
  }

  const onApply = async () => {
    if (validationError) return

    setBusy(true)
    try {
      // Snapshot current committed config so Cancel can undo this Apply.
      takeUndoSnapshot(activeNodeId)

      if (config.kind === "dataUpload") {
        if (file) {
          await uploadDataset(activeNodeId, file)
          push({ title: "Uploaded", description: "Dataset uploaded successfully." })
          setFile(null)
        }
      } else {
        updateNodeConfig(activeNodeId, draft)
        push({ title: "Saved", description: "Node configuration updated." })
      }
    } catch (e) {
      // If Apply failed, roll back snapshot to keep undo stack clean.
      replaceNodeConfig(activeNodeId, config.config)
      push({ title: "Error", description: getErrorMessage(e), variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const result = resultsPerNode[activeNodeId] as any

  const body = (() => {
    if (config.kind === "dataUpload") {
      const info = (config as any).config?.info
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>File</Label>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              disabled={isExecuting}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="text-xs text-muted-foreground">
              {(config as any).config?.fileName ? `Uploaded: ${(config as any).config.fileName}` : "No file uploaded yet."}
            </div>
          </div>

          {info ? (
            <div className="space-y-3">
              <Card className="p-3">
                <div className="text-sm font-medium">Dataset info</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Rows: {info.rows} • Columns: {info.columns}
                </div>
                <div className="mt-2 text-xs">
                  <div className="font-medium">Columns</div>
                  <div className="mt-1 max-h-24 overflow-auto text-muted-foreground">
                    {info.column_names.map((c: string) => (
                      <div key={c} className="flex justify-between gap-3">
                        <span className="truncate">{c}</span>
                        <span className="shrink-0">{info.dtypes[c]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <div>
                <div className="mb-2 text-sm font-medium">Preview (first 10 rows)</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {info.preview_columns.map((c: string) => (
                        <TableHead key={c}>{c}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {info.preview.map((row: any, idx: number) => (
                      <TableRow key={idx}>
                        {info.preview_columns.map((c: string) => (
                          <TableCell key={c}>{String(row[c] ?? "")}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>
      )
    }

    if (config.kind === "preprocessing") {
      const datasetId = (Object.values(allConfigs).find((c) => c.kind === "dataUpload") as any)?.config?.dataset_id

      const fetchPreview = async () => {
        if (!datasetId) {
          push({ title: "Missing data", description: "Upload data first.", variant: "destructive" })
          return
        }
        setBusy(true)
        try {
          const res = await api.get(`/api/preprocessing/${datasetId}/stats`)
          setPreviewStats(res.data)
        } catch (e) {
          push({ title: "Error", description: getErrorMessage(e), variant: "destructive" })
        } finally {
          setBusy(false)
        }
      }

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Operations</div>
            <InfoTip content="Standardization centers data to mean 0 and scales to unit variance. Normalization scales values into a fixed range (usually 0–1)." />
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(draft?.standardization)}
                disabled={isExecuting}
                onCheckedChange={(v) => setDraft((d: any) => ({ ...d, standardization: Boolean(v) }))}
              />
              Standardization (StandardScaler)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(draft?.normalization)}
                disabled={isExecuting}
                onCheckedChange={(v) => setDraft((d: any) => ({ ...d, normalization: Boolean(v) }))}
              />
              Normalization (MinMaxScaler)
            </label>
          </div>

          <div className="space-y-2">
            <Label>Columns</Label>
            <MultiSelect
              options={columnsFromData}
              value={draft?.columns || []}
              onChange={(cols) => setDraft((d: any) => ({ ...d, columns: cols }))}
            />
          </div>

          <Button variant="outline" disabled={isExecuting || busy} onClick={fetchPreview}>
            Preview statistics
          </Button>

          {previewStats ? (
            <Card className="p-3">
              <div className="text-sm font-medium">Before (describe)</div>
              <div className="mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead className="text-right">Mean</TableHead>
                      <TableHead className="text-right">Std</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {describeToRows(previewStats.describe).map((r: any) => (
                      <TableRow key={r.column}>
                        <TableCell className="max-w-[160px] truncate">{r.column}</TableCell>
                        <TableCell className="text-right">{r.mean ?? ""}</TableCell>
                        <TableCell className="text-right">{r.std ?? ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-2 text-xs text-muted-foreground">Showing up to 8 numeric columns.</div>
              </div>
            </Card>
          ) : null}

          {result?.statistics?.after?.describe ? (
            <Card className="p-3">
              <div className="text-sm font-medium">After (from pipeline run)</div>
              <div className="mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead className="text-right">Mean</TableHead>
                      <TableHead className="text-right">Std</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {describeToRows(result.statistics.after.describe).map((r: any) => (
                      <TableRow key={r.column}>
                        <TableCell className="max-w-[160px] truncate">{r.column}</TableCell>
                        <TableCell className="text-right">{r.mean ?? ""}</TableCell>
                        <TableCell className="text-right">{r.std ?? ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : null}
        </div>
      )
    }

    if (config.kind === "trainTestSplit") {
      const splitResult = resultsPerNode[activeNodeId] as any
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Split ratio</div>
            <InfoTip content="Splits the dataset into a training set (to fit the model) and a testing set (to evaluate generalization)." />
          </div>

          <div className="space-y-2">
            <Label>Test size: {(Number(draft?.test_size ?? 0.2) * 100).toFixed(0)}%</Label>
            <Slider
              disabled={isExecuting}
              value={[Number(draft?.test_size ?? 0.2)]}
              min={0.05}
              max={0.95}
              step={0.05}
              onValueChange={(v) => setDraft((d: any) => ({ ...d, test_size: v[0] }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Random state</Label>
            <Input
              type="number"
              disabled={isExecuting}
              value={draft?.random_state ?? 42}
              onChange={(e) => setDraft((d: any) => ({ ...d, random_state: Number(e.target.value) }))}
            />
          </div>

          {splitResult?.train_size ? (
            <Card className="p-3 text-sm">
              Training: {splitResult.train_size} rows • Testing: {splitResult.test_size} rows
            </Card>
          ) : null}
        </div>
      )
    }

    if (config.kind === "model") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Model type</div>
            <InfoTip content="Logistic Regression is a strong baseline linear classifier. Decision Trees learn rule-based splits and can provide feature importances." />
          </div>

          <RadioGroup
            value={draft?.model_type || "logistic_regression"}
            disabled={isExecuting}
            onValueChange={(v) =>
              setDraft((d: any) => ({
                ...d,
                model_type: v,
                hyperparameters:
                  v === "logistic_regression"
                    ? { max_iter: d.hyperparameters?.max_iter ?? 200, C: d.hyperparameters?.C ?? 1.0 }
                    : { max_depth: d.hyperparameters?.max_depth ?? undefined, min_samples_split: d.hyperparameters?.min_samples_split ?? 2, random_state: d.hyperparameters?.random_state ?? 42 },
              }))
            }
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="logistic_regression" />
              Logistic Regression
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="decision_tree" />
              Decision Tree Classifier
            </label>
          </RadioGroup>

          {draft?.model_type === "logistic_regression" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>max_iter</Label>
                <Input
                  type="number"
                  disabled={isExecuting}
                  value={draft?.hyperparameters?.max_iter ?? 200}
                  onChange={(e) => setDraft((d: any) => ({ ...d, hyperparameters: { ...d.hyperparameters, max_iter: Number(e.target.value) } }))}
                />
              </div>
              <div className="space-y-2">
                <Label>C</Label>
                <Input
                  type="number"
                  step="0.1"
                  disabled={isExecuting}
                  value={draft?.hyperparameters?.C ?? 1.0}
                  onChange={(e) => setDraft((d: any) => ({ ...d, hyperparameters: { ...d.hyperparameters, C: Number(e.target.value) } }))}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>max_depth</Label>
                <Input
                  type="number"
                  disabled={isExecuting}
                  value={draft?.hyperparameters?.max_depth ?? ""}
                  onChange={(e) => setDraft((d: any) => ({ ...d, hyperparameters: { ...d.hyperparameters, max_depth: e.target.value === "" ? undefined : Number(e.target.value) } }))}
                />
              </div>
              <div className="space-y-2">
                <Label>min_samples_split</Label>
                <Input
                  type="number"
                  disabled={isExecuting}
                  value={draft?.hyperparameters?.min_samples_split ?? 2}
                  onChange={(e) => setDraft((d: any) => ({ ...d, hyperparameters: { ...d.hyperparameters, min_samples_split: Number(e.target.value) } }))}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Target column</Label>
            <Select
              value={draft?.target_column || ""}
              onValueChange={(v) => setDraft((d: any) => ({ ...d, target_column: v }))}
              disabled={isExecuting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                {columnsFromData.map((c: string) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Feature columns</Label>
            <MultiSelect
              options={columnsFromData.filter((c: string) => c !== draft?.target_column)}
              value={draft?.feature_columns || []}
              onChange={(cols) => setDraft((d: any) => ({ ...d, feature_columns: cols }))}
              placeholder="Select features"
            />
          </div>
        </div>
      )
    }

    // results
    const metrics = result?.metrics
    const cm = result?.confusion_matrix as number[][] | undefined
    const report = result?.classification_report as any
    const importance = result?.feature_importance as { features: string[]; importances: number[] } | undefined

    const rows = importance
      ? importance.features
          .map((f, i) => ({ feature: f, importance: importance.importances[i] }))
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 20)
      : []

    const downloadJson = () => downloadText("results.json", JSON.stringify(result ?? {}, null, 2), "application/json")

    const downloadCsv = () => {
      const lines = [
        "metric,value",
        `accuracy,${metrics?.accuracy ?? ""}`,
        `precision,${metrics?.precision ?? ""}`,
        `recall,${metrics?.recall ?? ""}`,
        `f1,${metrics?.f1 ?? ""}`,
      ]
      downloadText("metrics.csv", lines.join("\n"), "text/csv")
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Evaluation</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadJson} disabled={!result}>
              <Download className="mr-2 h-4 w-4" /> JSON
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!result}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
        </div>

        {!result ? (
          <Card className="p-3 text-sm text-muted-foreground">Run the pipeline to see results.</Card>
        ) : (
          <Tabs defaultValue="metrics">
            <TabsList>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="cm">Confusion</TabsTrigger>
              <TabsTrigger value="viz">Visualizations</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics">
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>Accuracy</div>
                  <div className="text-right font-medium">{(Number(metrics?.accuracy ?? 0) * 100).toFixed(2)}%</div>
                  <div>Precision</div>
                  <div className="text-right font-medium">{Number(metrics?.precision ?? 0).toFixed(4)}</div>
                  <div>Recall</div>
                  <div className="text-right font-medium">{Number(metrics?.recall ?? 0).toFixed(4)}</div>
                  <div>F1</div>
                  <div className="text-right font-medium">{Number(metrics?.f1 ?? 0).toFixed(4)}</div>
                </div>
              </Card>
              {report ? (
                <Card className="mt-3 p-4">
                  <div className="text-sm font-medium">Classification report</div>
                  <div className="mt-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Precision</TableHead>
                          <TableHead className="text-right">Recall</TableHead>
                          <TableHead className="text-right">F1</TableHead>
                          <TableHead className="text-right">Support</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(report)
                          .filter(([k, v]) =>
                            k !== "accuracy" &&
                            typeof v === "object" &&
                            v !== null &&
                            (v as any).support !== undefined
                          )
                          .map(([k, v]) => (
                            <TableRow key={k}>
                              <TableCell className="font-medium">{k}</TableCell>
                              <TableCell className="text-right">{Number((v as any).precision ?? 0).toFixed(4)}</TableCell>
                              <TableCell className="text-right">{Number((v as any).recall ?? 0).toFixed(4)}</TableCell>
                              <TableCell className="text-right">{Number((v as any)["f1-score"] ?? 0).toFixed(4)}</TableCell>
                              <TableCell className="text-right">{Number((v as any).support ?? 0)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="cm">
              <Card className="p-4">
                <div className="text-sm font-medium">Confusion matrix</div>
                {cm ? (
                  <div className="mt-3">
                    <Table>
                      <TableBody>
                        {cm.map((row, r) => (
                          <TableRow key={r}>
                            {row.map((v, c) => (
                              <TableCell key={c} className="text-center font-medium">
                                {v}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">No confusion matrix available.</div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="viz">
              {rows.length ? (
                <Card className="p-4">
                  <div className="mb-2 text-sm font-medium">Feature importance (top 20)</div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rows} layout="vertical" margin={{ left: 24, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="feature" width={120} />
                        <ReTooltip />
                        <Bar dataKey="importance" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ) : (
                <Card className="p-3 text-sm text-muted-foreground">No feature importance (available for Decision Tree only).</Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    )
  })()

  return (
    <div
      className={
        "glass smooth fixed right-0 top-0 z-50 h-full w-[420px] border-l p-4 " +
        (isOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0")
      }
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{panelTitle}</div>
        <div className="flex items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSelectedNodeId(undefined)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="scroll-gutter mt-4 h-[calc(100%-124px)] overflow-auto pr-4">{body}</div>

      <div className="mt-4 flex items-center justify-between gap-2">
        {validationError ? <div className="text-xs text-destructive">{validationError}</div> : <div />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isExecuting || busy}>
            Cancel
          </Button>
          <Button onClick={onApply} disabled={isExecuting || busy || Boolean(validationError)}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
