import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex gap-3 rounded-lg border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-info/30 bg-info/10 text-foreground",
      success: "border-risk-low/30 bg-risk-low/10 text-foreground",
      warning: "border-risk-moderate/30 bg-risk-moderate/10 text-foreground",
      critical: "border-risk-critical/30 bg-risk-critical/10 text-foreground",
      neutral: "border-border bg-muted text-foreground",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
  neutral: Info,
};

export function Alert({
  variant,
  title,
  className,
  children,
}: VariantProps<typeof alertVariants> & {
  title?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const Icon = icons[variant ?? "info"];
  return (
    <div className={cn(alertVariants({ variant }), className)} role="status">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="mt-0.5 text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
