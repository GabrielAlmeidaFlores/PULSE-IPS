import { NextResponse } from "next/server"
import { getSuperAdminSession } from "@/modules/auth/session"
import { getOrganizationsForExport } from "@/modules/organizations/organization.service"

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(...fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsv).join(",")
}

export async function GET(): Promise<NextResponse> {
  const session = await getSuperAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const organizations = await getOrganizationsForExport()

  const formatDate = (d: Date | null | undefined): string =>
    d ? d.toISOString().split("T")[0] ?? "" : ""

  const formatBRL = (cents: number | null | undefined): string =>
    cents !== null && cents !== undefined
      ? (cents / 100).toFixed(2).replace(".", ",")
      : ""

  const intervalPtBR: Record<string, string> = { month: "Mensal", year: "Anual" }

  const headers = [
    "ID",
    "Nome",
    "Slug",
    "Plano",
    "Status do plano",
    "Colaboradores ativos",
    "Valor (R$)",
    "Recorrência",
    "Cobrança",
    "Ativa",
    "Criada em",
    "Assinatura desde",
  ]

  const lines: string[] = [headers.join(",")]

  for (const org of organizations) {
    lines.push(
      row(
        org.id,
        org.name,
        org.slug,
        org.plan?.name ?? "",
        org.subscription?.status ?? "",
        org._count.employees,
        formatBRL(org.subscription?.snapshotPriceInCents),
        org.subscription ? (intervalPtBR[org.subscription.snapshotInterval] ?? org.subscription.snapshotInterval) : "",
        org.billingStatus,
        org.isActive ? "Sim" : "Não",
        formatDate(org.createdAt),
        formatDate(org.subscription?.createdAt),
      )
    )
  }

  const csv = lines.join("\n")
  const filename = `pulse-export-${new Date().toISOString().split("T")[0]}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
