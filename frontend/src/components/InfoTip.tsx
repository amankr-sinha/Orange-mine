import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function InfoTip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
            <Info className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] leading-snug">{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
