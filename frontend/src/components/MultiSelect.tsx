import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
}: {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const toggle = React.useCallback(
    (opt: string) => {
      if (value.includes(opt)) onChange(value.filter((x) => x !== opt))
      else onChange([...value, opt])
    },
    [value, onChange]
  )

  const label = value.length ? `${value.length} selected` : placeholder

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-64 w-72 overflow-auto">
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => onChange(options)}>
          <span className="flex items-center gap-2">
            <Check className={value.length === options.length ? "h-4 w-4" : "h-4 w-4 opacity-0"} />
            Select All
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => onChange([])}>
          <span className="flex items-center gap-2">
            <Check className={value.length === 0 ? "h-4 w-4" : "h-4 w-4 opacity-0"} />
            Clear
          </span>
        </DropdownMenuItem>
        <div className="my-1 h-px bg-border" />
        {options.map((opt) => (
          <DropdownMenuItem key={opt} onSelect={(e) => e.preventDefault()} onClick={() => toggle(opt)}>
            <span className="flex items-center gap-2">
              <Check className={value.includes(opt) ? "h-4 w-4" : "h-4 w-4 opacity-0"} />
              {opt}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
