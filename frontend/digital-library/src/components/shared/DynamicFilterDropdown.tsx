// src/components/shared/DynamicFilterDropdown.tsx
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/utils/cn"

export interface FilterOption {
  value: string | number
  label: string
}

export interface DynamicFilterDropdownProps {
  label: string
  options: FilterOption[]
  selectedValue: string | number | null
  onChange: (value: string | number | null) => void
}

export function DynamicFilterDropdown({
  label,
  options,
  selectedValue,
  onChange,
}: DynamicFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options.find((o) => o.value === selectedValue)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
          selectedValue !== null
            ? "border-primary-500 bg-primary-50 text-primary-700"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        )}
      >
        {selectedOption ? `${label}: ${selectedOption.label}` : label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            isOpen && "rotate-180",
            selectedValue !== null ? "text-primary-600" : "text-gray-400"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-48 overflow-y-auto rounded-lg border border-gray-100 bg-white py-1 shadow-lg custom-scrollbar animate-in fade-in zoom-in-95">
          <button
            onClick={() => {
              onChange(null)
              setIsOpen(false)
            }}
            className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <span>Tất cả {label}</span>
            {selectedValue === null && (
              <Check className="h-4 w-4 text-primary-600" />
            )}
          </button>

          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400 italic">Trống</div>
          )}

          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(selectedValue === opt.value ? null : opt.value)
                setIsOpen(false)
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="truncate pr-2">{opt.label}</span>
              {selectedValue === opt.value && (
                <Check className="h-4 w-4 shrink-0 text-primary-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}