import { useState, useRef, useEffect, useMemo } from "react"
import { ChevronDown, Check, Search, Plus } from "lucide-react"
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
  searchable?: boolean
  searchPlaceholder?: string
  onManage?: () => void  
}

export function DynamicFilterDropdown({
  label,
  options,
  selectedValue,
  onChange,
  searchable = false,
  searchPlaceholder = "Tìm kiếm...",
  onManage, 
}: DynamicFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
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

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("")
    }
  }, [isOpen])

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
  }, [options, searchQuery, searchable])

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
        <div className="absolute left-0 top-full z-50 mt-1 flex max-h-60 min-w-[14rem] flex-col rounded-lg border border-gray-100 bg-white shadow-lg animate-in fade-in zoom-in-95">
          
          <div className="overflow-y-auto py-1 custom-scrollbar">
            {/* Ô input tìm kiếm (chỉ hiển thị nếu searchable = true) */}
            {searchable && (
              <div className="sticky top-0 z-10 bg-white px-2 pb-1 border-b border-gray-50 mb-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => {
                onChange(null)
                setIsOpen(false)
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="font-medium text-primary-600">Tất cả {label.toLowerCase()}</span>
              {selectedValue === null && (
                <Check className="h-4 w-4 text-primary-600" />
              )}
            </button>

            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-gray-400 italic">
                Không tìm thấy kết quả
              </div>
            )}

            {filteredOptions.map((opt) => (
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

          {/* THÊM PHẦN CHÂN DROPDOWN CHO NÚT "QUẢN LÝ" */}
          {onManage && (
            <div className="border-t border-gray-100 bg-gray-50/50 p-1">
              <button
                onClick={() => {
                  setIsOpen(false)
                  onManage()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm / Quản lý nhãn</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}