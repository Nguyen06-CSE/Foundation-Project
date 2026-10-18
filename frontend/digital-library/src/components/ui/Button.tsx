import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

const variantStyles: Record<string, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  outline: "border border-gray-200 bg-white hover:bg-gray-50 text-gray-900",
  ghost: "hover:bg-gray-100 text-gray-900",
  danger: "text-red-500 hover:bg-red-50 hover:text-red-600",
};

const sizeStyles: Record<string, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 py-2 text-sm",
  lg: "h-12 px-8 text-lg",
  icon: "h-10 w-10",
};

export const buttonVariants = ({
  variant = "primary",
  size = "default",
  className,
}: {
  variant?: string | null;
  size?: string | null;
  className?: string;
} = {}) => {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 disabled:pointer-events-none disabled:opacity-50 gap-2",
    variantStyles[variant || "primary"] || variantStyles.primary,
    sizeStyles[size || "default"] || sizeStyles.default,
    className
  );
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger" | "secondary" | (string & {});
  size?: "default" | "sm" | "md" | "lg" | "icon" | (string & {});
  icon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", icon, children, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };