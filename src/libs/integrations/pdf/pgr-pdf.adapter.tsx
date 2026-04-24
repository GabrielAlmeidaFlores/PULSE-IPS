import React from "react"
import { Document, Page, View, Text, StyleSheet, renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import type { PgrPdfInput, PgrPdfDept } from "@/libs/integrations/pdf/pgr-pdf.types"

const FONT_BOLD = "Helvetica-Bold"
const BLUE = "#2563eb"
const BLUE_LIGHT = "#dbeafe"
const BLUE_DARK = "#1e3a5f"
const GREEN = "#16a34a"
const GREEN_LIGHT = "#dcfce7"
const AMBER = "#d97706"
const AMBER_LIGHT = "#fef3c7"
const RED = "#dc2626"
const RED_LIGHT = "#fee2e2"
const GRAY_50 = "#f8fafc"
const GRAY_100 = "#f1f5f9"
const GRAY_200 = "#e2e8f0"
const GRAY_500 = "#64748b"
const GRAY_700 = "#334155"
const GRAY_900 = "#0f172a"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    paddingBottom: 48,
  },
  pageHeader: {
    backgroundColor: BLUE_DARK,
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 20,
  },
  pageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brandText: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: "#ffffff",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  docTitle: {
    fontSize: 7,
    color: "#93c5fd",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  orgName: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    color: "#ffffff",
  },
  periodText: {
    fontSize: 9,
    color: "#93c5fd",
    marginTop: 3,
    textTransform: "capitalize",
  },
  body: {
    paddingHorizontal: 36,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 7,
    fontFamily: FONT_BOLD,
    color: GRAY_500,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    backgroundColor: GRAY_50,
    borderWidth: 1,
    borderColor: GRAY_200,
    padding: 12,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 20,
    fontFamily: FONT_BOLD,
    color: GRAY_900,
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 7,
    color: GRAY_500,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  healthIndexBox: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 8,
    fontFamily: FONT_BOLD,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statusDate: {
    fontSize: 8,
    color: GRAY_500,
  },
  deptsOverview: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  deptOverviewBox: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  deptOverviewCount: {
    fontSize: 18,
    fontFamily: FONT_BOLD,
  },
  deptOverviewLabel: {
    fontSize: 7,
    color: GRAY_500,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 3,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: GRAY_100,
    borderWidth: 1,
    borderColor: GRAY_200,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: FONT_BOLD,
    color: GRAY_500,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: GRAY_200,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tableRowAlt: {
    backgroundColor: GRAY_50,
  },
  tableCell: {
    fontSize: 8,
    color: GRAY_700,
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: FONT_BOLD,
    color: GRAY_900,
  },
  deptCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: GRAY_200,
  },
  deptCardHeader: {
    backgroundColor: GRAY_100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  deptCardName: {
    fontSize: 9,
    fontFamily: FONT_BOLD,
    color: GRAY_900,
  },
  deptMetaRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  deptMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deptMetaLabel: {
    fontSize: 7,
    color: GRAY_500,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  deptMetaValue: {
    fontSize: 8,
    fontFamily: FONT_BOLD,
    color: GRAY_900,
  },
  questionRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
    alignItems: "center",
  },
  questionRowAlt: {
    backgroundColor: GRAY_50,
  },
  questionText: {
    fontSize: 8,
    color: GRAY_700,
    flex: 1,
  },
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  scoreText: {
    fontSize: 8,
    fontFamily: FONT_BOLD,
  },
  barContainer: {
    width: 80,
    height: 6,
    backgroundColor: GRAY_200,
    borderRadius: 3,
    marginRight: 8,
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: GRAY_500,
  },
  nr1Badge: {
    fontSize: 7,
    color: BLUE,
    fontFamily: FONT_BOLD,
    letterSpacing: 0.5,
  },
  coverHeroBox: {
    marginTop: 24,
    marginBottom: 24,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: BLUE,
    backgroundColor: BLUE_LIGHT,
  },
  coverHeroValue: {
    fontSize: 42,
    fontFamily: FONT_BOLD,
    color: BLUE_DARK,
  },
  coverHeroLabel: {
    fontSize: 9,
    color: GRAY_500,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  coverHeroSub: {
    fontSize: 8,
    color: GRAY_500,
    marginTop: 6,
  },
})

function healthBgColor(hi: number): string {
  if (hi >= 62) return GREEN_LIGHT
  if (hi >= 37) return AMBER_LIGHT
  return RED_LIGHT
}

function healthColor(hi: number): string {
  if (hi >= 62) return GREEN
  if (hi >= 37) return AMBER
  return RED
}

function healthLabel(hi: number): string {
  if (hi >= 62) return "Saudável"
  if (hi >= 37) return "Atenção"
  return "Crítico"
}

function adherenceColor(pct: number): string {
  if (pct >= 80) return GREEN
  if (pct >= 50) return AMBER
  return RED
}

function toHealthIndex(avgScore: number): number {
  if (avgScore <= 0) return 0
  return Math.round(((avgScore - 1) / 4) * 100)
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatDateTime(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

interface PageFooterProps {
  orgName: string
  pageLabel: string
}

function PageFooter({ orgName, pageLabel }: PageFooterProps): React.ReactElement {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{orgName} · Relatório PGR · Pulse</Text>
      <Text style={styles.nr1Badge}>NR-1 Conformidade</Text>
      <Text style={styles.footerText}>{pageLabel}</Text>
    </View>
  )
}

interface CoverPageProps {
  data: PgrPdfInput
}

function CoverPage({ data }: CoverPageProps): React.ReactElement {
  const statusLabel = data.status === "reviewed" ? "Revisado" : "Gerado"
  const statusColor = data.status === "reviewed" ? GREEN : BLUE
  const statusBg = data.status === "reviewed" ? GREEN_LIGHT : BLUE_LIGHT

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderRow}>
          <View>
            <Text style={styles.brandText}>Pulse</Text>
            <Text style={styles.docTitle}>Relatório PGR — NR-1</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.orgName}>{data.orgName}</Text>
            <Text style={styles.periodText}>{data.periodLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.statusDate}>
            {data.reviewedAt
              ? `Revisado em ${formatDate(data.reviewedAt)}`
              : `Gerado em ${formatDateTime(data.generatedAt)}`}
          </Text>
        </View>

        {data.globalHealthIndex !== null ? (
          <View style={[styles.coverHeroBox, {
            borderLeftColor: healthColor(data.globalHealthIndex),
            backgroundColor: healthBgColor(data.globalHealthIndex),
          }]}>
            <Text style={[styles.coverHeroValue, { color: healthColor(data.globalHealthIndex) }]}>
              {data.globalHealthIndex}%
            </Text>
            <Text style={[styles.coverHeroLabel, { color: healthColor(data.globalHealthIndex) }]}>
              Índice de saúde organizacional · {healthLabel(data.globalHealthIndex)}
            </Text>
            <Text style={styles.coverHeroSub}>
              Média ponderada dos índices de saúde de todos os setores com dados suficientes para análise.
            </Text>
          </View>
        ) : (
          <View style={[styles.coverHeroBox, { borderLeftColor: GRAY_500, backgroundColor: GRAY_100 }]}>
            <Text style={[styles.coverHeroValue, { color: GRAY_500 }]}>—</Text>
            <Text style={[styles.coverHeroLabel, { color: GRAY_500 }]}>Dados insuficientes para cálculo do índice</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Métricas do Período</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{data.totalResponses}</Text>
            <Text style={styles.metricLabel}>Respostas</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{data.totalRecipients}</Text>
            <Text style={styles.metricLabel}>Enviados</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{data.adherencePct}%</Text>
            <Text style={styles.metricLabel}>Adesão</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{data.departments.length}</Text>
            <Text style={styles.metricLabel}>Setores</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 4 }]}>Distribuição de Saúde por Setor</Text>

        <View style={styles.deptsOverview}>
          <View style={[styles.deptOverviewBox, { borderColor: GREEN, backgroundColor: GREEN_LIGHT }]}>
            <Text style={[styles.deptOverviewCount, { color: GREEN }]}>{data.healthyDepts}</Text>
            <Text style={[styles.deptOverviewLabel, { color: GREEN }]}>Saudável</Text>
          </View>
          <View style={[styles.deptOverviewBox, { borderColor: AMBER, backgroundColor: AMBER_LIGHT }]}>
            <Text style={[styles.deptOverviewCount, { color: AMBER }]}>{data.warningDepts}</Text>
            <Text style={[styles.deptOverviewLabel, { color: AMBER }]}>Atenção</Text>
          </View>
          <View style={[styles.deptOverviewBox, { borderColor: RED, backgroundColor: RED_LIGHT }]}>
            <Text style={[styles.deptOverviewCount, { color: RED }]}>{data.criticalDepts}</Text>
            <Text style={[styles.deptOverviewLabel, { color: RED }]}>Crítico</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 4 }]}>Resumo por Setor</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Setor</Text>
          <Text style={[styles.tableHeaderCell, { width: 80 }]}>Índice de Saúde</Text>
          <Text style={[styles.tableHeaderCell, { width: 60 }]}>Respostas</Text>
          <Text style={[styles.tableHeaderCell, { width: 60 }]}>Adesão</Text>
          <Text style={[styles.tableHeaderCell, { width: 60 }]}>Colaboradores</Text>
        </View>
        {data.departments.map((dept, i) => {
          const hi = dept.healthIndex ?? (dept.avgScore > 0 ? toHealthIndex(dept.avgScore) : null)
          return (
            <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCellBold, { flex: 2 }]}>{dept.name}</Text>
              <View style={{ width: 80, flexDirection: "row", alignItems: "center", gap: 4 }}>
                {hi !== null ? (
                  <>
                    <View style={[styles.barContainer, { width: 36 }]}>
                      <View style={[styles.bar, { width: `${hi}%`, backgroundColor: healthColor(hi) }]} />
                    </View>
                    <Text style={[styles.tableCell, { color: healthColor(hi) }]}>{hi}%</Text>
                  </>
                ) : (
                  <Text style={styles.tableCell}>—</Text>
                )}
              </View>
              <Text style={[styles.tableCell, { width: 60 }]}>{dept.responseCount}</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>{dept.adherencePct}%</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>{dept.employeeCount}</Text>
            </View>
          )
        })}
      </View>

      <PageFooter orgName={data.orgName} pageLabel={`Período: ${data.periodLabel}`} />
    </Page>
  )
}

interface DeptPageProps {
  dept: PgrPdfDept
  orgName: string
  periodLabel: string
}

function DeptPage({ dept, orgName, periodLabel }: DeptPageProps): React.ReactElement {
  const hi = dept.healthIndex ?? (dept.avgScore > 0 ? toHealthIndex(dept.avgScore) : null)
  const sortedQuestions = [...dept.questions].sort((a, b) => a.order - b.order)

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderRow}>
          <View>
            <Text style={styles.brandText}>Pulse · Detalhe por Setor</Text>
            <Text style={styles.docTitle}>Relatório PGR — NR-1</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.orgName}>{orgName}</Text>
            <Text style={styles.periodText}>{periodLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.deptCard}>
          <View style={styles.deptCardHeader}>
            <Text style={styles.deptCardName}>{dept.name}</Text>
            {hi !== null && (
              <View style={[styles.statusBadge, { backgroundColor: healthBgColor(hi), borderColor: healthColor(hi) }]}>
                <Text style={[styles.statusText, { color: healthColor(hi) }]}>
                  {hi}% · {healthLabel(hi)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.deptMetaRow}>
            <View style={styles.deptMetaItem}>
              <Text style={styles.deptMetaLabel}>Colaboradores:</Text>
              <Text style={styles.deptMetaValue}>{dept.employeeCount}</Text>
            </View>
            <View style={styles.deptMetaItem}>
              <Text style={styles.deptMetaLabel}>Respostas:</Text>
              <Text style={styles.deptMetaValue}>{dept.responseCount}</Text>
            </View>
            <View style={styles.deptMetaItem}>
              <Text style={styles.deptMetaLabel}>Enviados:</Text>
              <Text style={styles.deptMetaValue}>{dept.totalRecipients}</Text>
            </View>
            <View style={styles.deptMetaItem}>
              <Text style={styles.deptMetaLabel}>Adesão:</Text>
              <Text style={[styles.deptMetaValue, {
                color: adherenceColor(dept.adherencePct),
              }]}>{dept.adherencePct}%</Text>
            </View>
          </View>

          {sortedQuestions.length > 0 ? (
            <>
              <View style={[styles.tableHeader, { borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }]}>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Pergunta</Text>
                <Text style={[styles.tableHeaderCell, { width: 90 }]}>Índice de Saúde</Text>
                <Text style={[styles.tableHeaderCell, { width: 60 }]}>Respostas</Text>
              </View>
              {sortedQuestions.map((q, i) => {
                const qHi = toHealthIndex(q.avgScore)
                return (
                  <View key={i} style={[styles.questionRow, i % 2 !== 0 ? styles.questionRowAlt : {}]}>
                    <Text style={styles.questionText}>{q.text}</Text>
                    <View style={{ width: 90, flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <View style={[styles.barContainer, { width: 44 }]}>
                        <View style={[styles.bar, { width: `${qHi}%`, backgroundColor: healthColor(qHi) }]} />
                      </View>
                      <Text style={[styles.scoreText, { color: healthColor(qHi) }]}>{qHi}%</Text>
                    </View>
                    <Text style={[styles.tableCell, { width: 60 }]}>{q.responseCount}</Text>
                  </View>
                )
              })}
            </>
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 8, color: GRAY_500, textAlign: "center" }}>
                Dados insuficientes para exibir breakdown por pergunta (mínimo de 5 respondentes por pergunta).
              </Text>
            </View>
          )}
        </View>
      </View>

      <PageFooter orgName={orgName} pageLabel={`Setor: ${dept.name}`} />
    </Page>
  )
}

interface PgrDocumentProps {
  data: PgrPdfInput
}

function PgrDocument({ data }: PgrDocumentProps): React.ReactElement {
  return (
    <Document
      title={`Relatório PGR — ${data.orgName} — ${data.periodLabel}`}
      author="Pulse"
      subject="Programa de Gerenciamento de Riscos — NR-1"
      creator="Pulse"
      producer="Pulse"
    >
      <CoverPage data={data} />
      {data.departments.map((dept, i) => (
        <DeptPage key={i} dept={dept} orgName={data.orgName} periodLabel={data.periodLabel} />
      ))}
    </Document>
  )
}

export async function generatePgrPdf(data: PgrPdfInput): Promise<Buffer> {
  const element = React.createElement(PgrDocument, { data }) as React.ReactElement<DocumentProps>
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
