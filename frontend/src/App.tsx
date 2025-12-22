import * as React from "react"

import { NodeConfigPanel } from "@/components/NodeConfigPanel"
import { PipelineCanvas } from "@/components/PipelineCanvas"
import { Sidebar } from "@/components/Sidebar"
import { ToastHost } from "@/components/ToastHost"
import { TopBar } from "@/components/TopBar"
import { ExecutionToasts } from "@/components/ExecutionToasts"
import { ToastProviderState } from "@/components/ui/use-toast"
import { usePipelineStore } from "@/lib/pipelineStore"

export function App() {
	const isExecuting = usePipelineStore((s) => s.isExecuting)
	const executionId = usePipelineStore((s) => s.executionId)
	const pollOnce = usePipelineStore((s) => s.pollExecutionOnce)

	React.useEffect(() => {
		if (!executionId || !isExecuting) return

		const t = window.setInterval(() => {
			void pollOnce()
		}, 1000)

		return () => window.clearInterval(t)
	}, [executionId, isExecuting, pollOnce])

	return (
		<ToastProviderState>
			<div className="app-gradient h-screen w-screen overflow-hidden">
				<ExecutionToasts />
				<TopBar />
				<div className="flex h-[calc(100vh-49px)]">
					<Sidebar />
					<div className="relative flex-1">
						<PipelineCanvas />
						<NodeConfigPanel />
					</div>
				</div>
				<ToastHost />
			</div>
		</ToastProviderState>
	)
}

export default App