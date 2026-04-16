import { Badge } from "@/components/ui/badge"

type StatusVariant = "active" | "inactive" | "pending" | "open" | "resolved" | "cancelled" | "critical" | "warning"

interface StatusBadgeProps {
  status: string
}

const variantMap: Record<StatusVariant, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  resolved: "default",
  inactive: "secondary",
  pending: "secondary",
  open: "secondary",
  cancelled: "secondary",
  critical: "destructive",
  warning: "outline",
}

export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const variant = variantMap[status as StatusVariant] ?? "secondary"
  return <Badge variant={variant}>{status}</Badge>
}
