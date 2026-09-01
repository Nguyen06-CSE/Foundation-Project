import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface DropdownItem {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

const Dropdown = ({ trigger, items, align = "right" }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldFlipLeft, setShouldFlipLeft] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const triggerRect = dropdownRef.current.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth ?? 208;
    setShouldFlipLeft(triggerRect.right + menuWidth > window.innerWidth);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            "absolute z-50 mt-2 min-w-[208px] rounded-lg border border-gray-100 bg-white py-1 shadow-lg",
            shouldFlipLeft || align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2 text-sm text-left transition-colors hover:bg-gray-50",
                item.danger
                  ? "text-red-500 border-t border-gray-100 mt-1 pt-2"
                  : "text-gray-700"
              )}
            >
              {item.icon && (
                <span className={cn("w-4 h-4", item.danger ? "text-red-500" : "text-gray-500")}>
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { Dropdown };
