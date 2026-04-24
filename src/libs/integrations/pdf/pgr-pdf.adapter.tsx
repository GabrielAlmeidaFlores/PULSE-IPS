import React from "react"
import { Document, Page, View, Text, StyleSheet, renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import type { PgrPdfInput, PgrPdfDept, PgrPdfAggregatedQuestion } from "@/libs/integrations/pdf/pgr-pdf.types"

const FONT_BOLD = "Helvetica-Bold"
const BLUE = "#2563eb"
const BLUE_LIGHT = "#dbeafe"
const BLUE_DARK = "#1e3a5f"
const GREEN = "#16a34a"
const GREEN_LIGHT = "#dcfce7"
const GREEN_BORDER = "#86efac"
const AMBER = "#d97706"
const AMBER_LIGHT = "#fef3c7"
const AMBER_BORDER = "#fcd34d"
const RED = "#dc2626"
const RED_LIGHT = "#fee2e2"
const RED_BORDER = "#fca5a5"
const GRAY_50 = "#f8fafc"
const GRAY_100 = "#f1f5f9"
const GRAY_200 = "#e2e8f0"
const GRAY_500 = "#64748b"
const GRAY_700 = "#334155"
const GRAY_900 = "#0f172a"
const SCORE_1 = "#ef4444"
const SCORE_2 = "#f97316"
const SCORE_3 = "#eab308"
const SCORE_4 = "#84cc16"
const SCORE_5 = "#22c55e"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    paddingBottom: 52,
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
    paddingTop: 22,
  },
  sectionTitle: {
    fontSize: 7,
    fontFamily: FONT_BOLD,
    color: GRAY_500,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  metricBox: {
    flex: 1,
    backgroundColor: GRAY_50,
    borderWidth: 1,
    borderColor: GRAY_200,
    padding: 10,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 18,
    fontFamily: FONT_BOLD,
    color: GRAY_900,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 6,
    color: GRAY_500,
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  metricSubLabel: {
    fontSize: 6,
    color: GRAY_500,
    textAlign: "center",
    marginTop: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
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
  nextReviewText: {
    fontSize: 8,
    color: BLUE,
    fontFamily: FONT_BOLD,
    marginLeft: 8,
  },
  deptsOverview: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  deptOverviewBox: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  deptOverviewCount: {
    fontSize: 20,
    fontFamily: FONT_BOLD,
  },
  deptOverviewLabel: {
    fontSize: 6,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: GRAY_100,
    borderWidth: 1,
    borderColor: GRAY_200,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tableHeaderCell: {
    fontSize: 6,
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: GRAY_50,
  },
  tableCell: {
    fontSize: 7,
    color: GRAY_700,
  },
  tableCellBold: {
    fontSize: 7,
    fontFamily: FONT_BOLD,
    color: GRAY_900,
  },
  barContainer: {
    height: 5,
    backgroundColor: GRAY_200,
    borderRadius: 3,
  },
  bar: {
    height: 5,
    borderRadius: 3,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    paddingTop: 7,
  },
  footerText: {
    fontSize: 6,
    color: GRAY_500,
  },
  nr1Badge: {
    fontSize: 6,
    color: BLUE,
    fontFamily: FONT_BOLD,
    letterSpacing: 0.5,
  },
  coverHeroBox: {
    marginTop: 18,
    marginBottom: 18,
    padding: 18,
    borderLeftWidth: 4,
  },
  coverHeroValue: {
    fontSize: 40,
    fontFamily: FONT_BOLD,
  },
  coverHeroLabel: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 3,
  },
  coverHeroSub: {
    fontSize: 7,
    color: GRAY_500,
    marginTop: 4,
    lineHeight: 1.4,
  },
  deptCard: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: GRAY_200,
  },
  deptCardHeader: {
    paddingHorizontal: 10,
    paddingVertical: 7,
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
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  deptMetaCell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRightWidth: 1,
    borderRightColor: GRAY_200,
  },
  deptMetaLabel: {
    fontSize: 6,
    color: GRAY_500,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  deptMetaValue: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: GRAY_900,
  },
  deptMetaSubValue: {
    fontSize: 6,
    color: GRAY_500,
    marginTop: 1,
  },
  qDistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: GRAY_50,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  qDistLabel: {
    fontSize: 6,
    color: GRAY_500,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginRight: 4,
  },
  qDistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  qDistDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  qDistText: {
    fontSize: 7,
    fontFamily: FONT_BOLD,
  },
  qDistSubText: {
    fontSize: 6,
    color: GRAY_500,
  },
  bestWorstRow: {
    flexDirection: "row",
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  bestWorstCell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: GRAY_200,
  },
  bestWorstLabel: {
    fontSize: 6,
    color: GRAY_500,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  bestWorstContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },
  bestWorstOrderBadge: {
    fontSize: 6,
    fontFamily: FONT_BOLD,
    color: GRAY_500,
    borderWidth: 1,
    borderColor: GRAY_200,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginTop: 1,
  },
  bestWorstText: {
    fontSize: 7,
    color: GRAY_700,
    flex: 1,
    lineHeight: 1.3,
  },
  bestWorstScore: {
    fontSize: 9,
    fontFamily: FONT_BOLD,
    marginTop: 1,
  },
  questionRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
    alignItems: "center",
  },
  questionRowAlt: {
    backgroundColor: GRAY_50,
  },
  questionText: {
    fontSize: 7,
    color: GRAY_700,
    flex: 1,
    lineHeight: 1.3,
  },
  scorePill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  scoreText: {
    fontSize: 7,
    fontFamily: FONT_BOLD,
  },
  directionBadge: {
    fontSize: 6,
    color: GRAY_500,
    borderWidth: 1,
    borderColor: GRAY_200,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginRight: 4,
  },
  distSectionHeader: {
    flexDirection: "row",
    backgroundColor: GRAY_100,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  distRowQ: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
    alignItems: "center",
  },
  distRowQAlt: {
    backgroundColor: GRAY_50,
  },
  noteBox: {
    borderWidth: 1,
    borderColor: BLUE_LIGHT,
    backgroundColor: "#eff6ff",
    padding: 10,
    marginBottom: 16,
  },
  noteLabel: {
    fontSize: 6,
    fontFamily: FONT_BOLD,
    color: BLUE,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 8,
    color: GRAY_700,
    lineHeight: 1.5,
  },
  methodologyBox: {
    borderWidth: 1,
    borderColor: GRAY_200,
    backgroundColor: GRAY_50,
    padding: 12,
    marginBottom: 12,
  },
  methodologyTitle: {
    fontSize: 7,
    fontFamily: FONT_BOLD,
    color: GRAY_700,
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  methodologyText: {
    fontSize: 7,
    color: GRAY_500,
    lineHeight: 1.5,
  },
})

function healthBgColor(hi: number): string {
  if (hi >= 62) return GREEN_LIGHT
  if (hi >= 37) return AMBER_LIGHT
  return RED_LIGHT
}

function healthBorderColor(hi: number): string {
  if (hi >= 62) return GREEN_BORDER
  if (hi >= 37) return AMBER_BORDER
  return RED_BORDER
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

function scoreColor(n: number): string {
  if (n === 1) return SCORE_1
  if (n === 2) return SCORE_2
  if (n === 3) return SCORE_3
  if (n === 4) return SCORE_4
  return SCORE_5
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

function directionLabel(scoreDirection: string): string {
  return scoreDirection === "lower_is_better" ? "menor melhor" : "maior melhor"
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
  const statusBorder = data.status === "reviewed" ? GREEN_BORDER : "#93c5fd"

  const sortedDepts = [...data.departments].sort((a, b) => {
    const ha = a.healthIndex ?? 0
    const hb = b.healthIndex ?? 0
    return ha - hb
  })

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
          <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.statusDate}>
            {data.reviewedAt
              ? `Revisado em ${formatDate(data.reviewedAt)}`
              : `Gerado em ${formatDateTime(data.generatedAt)}`}
          </Text>
          {data.nextReviewAt !== null && (
            <Text style={styles.nextReviewText}>
              Próxima revisão: {formatDate(data.nextReviewAt)}
            </Text>
          )}
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
              Índice de Saúde Organizacional · {healthLabel(data.globalHealthIndex)}
            </Text>
            <Text style={styles.coverHeroSub}>
              Média ponderada dos índices de saúde de todos os setores com dados suficientes para análise.
              {"\n"}
              Fórmula: Índice = ((nota média – 1) / 4) × 100 · Escala: 0–100%
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
            <Text style={[styles.metricValue, { color: adherenceColor(data.adherencePct) }]}>{data.adherencePct}%</Text>
            <Text style={styles.metricLabel}>Adesão Global</Text>
            <Text style={styles.metricSubLabel}>{data.totalResponses}/{data.totalRecipients}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{data.totalEmployees}</Text>
            <Text style={styles.metricLabel}>Colaboradores</Text>
            <Text style={styles.metricSubLabel}>monitorados</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{data.departments.length}</Text>
            <Text style={styles.metricLabel}>Setores</Text>
            <Text style={styles.metricSubLabel}>avaliados</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{data.aggregatedQuestions.length}</Text>
            <Text style={styles.metricLabel}>Perguntas</Text>
            <Text style={styles.metricSubLabel}>avaliadas</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 2 }]}>Distribuição de Saúde por Setor</Text>

        <View style={styles.deptsOverview}>
          <View style={[styles.deptOverviewBox, { borderColor: GREEN_BORDER, backgroundColor: GREEN_LIGHT }]}>
            <Text style={[styles.deptOverviewCount, { color: GREEN }]}>{data.healthyDepts}</Text>
            <Text style={[styles.deptOverviewLabel, { color: GREEN }]}>Saudável</Text>
            <Text style={[styles.metricSubLabel, { color: GREEN }]}>≥ 62%</Text>
          </View>
          <View style={[styles.deptOverviewBox, { borderColor: AMBER_BORDER, backgroundColor: AMBER_LIGHT }]}>
            <Text style={[styles.deptOverviewCount, { color: AMBER }]}>{data.warningDepts}</Text>
            <Text style={[styles.deptOverviewLabel, { color: AMBER }]}>Atenção</Text>
            <Text style={[styles.metricSubLabel, { color: AMBER }]}>37% – 61%</Text>
          </View>
          <View style={[styles.deptOverviewBox, { borderColor: RED_BORDER, backgroundColor: RED_LIGHT }]}>
            <Text style={[styles.deptOverviewCount, { color: RED }]}>{data.criticalDepts}</Text>
            <Text style={[styles.deptOverviewLabel, { color: RED }]}>Crítico</Text>
            <Text style={[styles.metricSubLabel, { color: RED }]}>&lt; 37%</Text>
          </View>
        </View>

        {data.aggregatedQuestions.length > 0 && (() => {
          const best = data.aggregatedQuestions[data.aggregatedQuestions.length - 1]
          const worst = data.aggregatedQuestions[0]
          if (!best || !worst) return null
          return (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 2 }]}>Indicadores de Destaque — Visão Geral</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                <View style={{ flex: 1, borderWidth: 1, borderColor: GREEN_BORDER, backgroundColor: GREEN_LIGHT, padding: 10 }}>
                  <Text style={[styles.qDistLabel, { color: GREEN, marginBottom: 4 }]}>Melhor Indicador</Text>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                    <Text style={[styles.bestWorstOrderBadge, { marginTop: 1 }]}>P{best.order}</Text>
                    <Text style={[styles.questionText, { flex: 1 }]}>{best.text}</Text>
                    <Text style={[styles.bestWorstScore, { color: healthColor(best.healthIndex) }]}>{best.healthIndex}%</Text>
                  </View>
                </View>
                <View style={{ flex: 1, borderWidth: 1, borderColor: RED_BORDER, backgroundColor: RED_LIGHT, padding: 10 }}>
                  <Text style={[styles.qDistLabel, { color: RED, marginBottom: 4 }]}>Maior Risco</Text>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                    <Text style={[styles.bestWorstOrderBadge, { marginTop: 1 }]}>P{worst.order}</Text>
                    <Text style={[styles.questionText, { flex: 1 }]}>{worst.text}</Text>
                    <Text style={[styles.bestWorstScore, { color: healthColor(worst.healthIndex) }]}>{worst.healthIndex}%</Text>
                  </View>
                </View>
              </View>
            </>
          )
        })()}

        <Text style={[styles.sectionTitle, { marginTop: 2 }]}>Resumo por Setor</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Setor</Text>
          <Text style={[styles.tableHeaderCell, { width: 76 }]}>Índice de Saúde</Text>
          <Text style={[styles.tableHeaderCell, { width: 52 }]}>Respostas</Text>
          <Text style={[styles.tableHeaderCell, { width: 40 }]}>Adesão</Text>
          <Text style={[styles.tableHeaderCell, { width: 50 }]}>Colaboradores</Text>
          <Text style={[styles.tableHeaderCell, { width: 60 }]}>Perguntas S/A/C</Text>
        </View>
        {sortedDepts.map((dept, i) => {
          const hi = dept.healthIndex ?? (dept.avgScore > 0 ? toHealthIndex(dept.avgScore) : null)
          return (
            <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCellBold, { flex: 2 }]}>{dept.name}</Text>
              <View style={{ width: 76, flexDirection: "row", alignItems: "center", gap: 4 }}>
                {hi !== null ? (
                  <>
                    <View style={[styles.barContainer, { width: 32, flex: 0 }]}>
                      <View style={[styles.bar, { width: `${hi}%`, backgroundColor: healthColor(hi) }]} />
                    </View>
                    <Text style={[styles.tableCell, { color: healthColor(hi), fontFamily: FONT_BOLD, fontSize: 7 }]}>{hi}%</Text>
                  </>
                ) : (
                  <Text style={styles.tableCell}>—</Text>
                )}
              </View>
              <Text style={[styles.tableCell, { width: 52 }]}>{dept.responseCount}/{dept.totalRecipients}</Text>
              <Text style={[styles.tableCell, { width: 40, color: adherenceColor(dept.adherencePct) }]}>{dept.adherencePct}%</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>{dept.employeeCount}</Text>
              <Text style={[styles.tableCell, { width: 60, color: GRAY_500 }]}>
                {dept.healthyQs > 0 ? `${dept.healthyQs}S` : ""}
                {dept.warningQs > 0 ? ` ${dept.warningQs}A` : ""}
                {dept.criticalQs > 0 ? ` ${dept.criticalQs}C` : ""}
              </Text>
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
          <View style={[styles.deptCardHeader, hi !== null ? { backgroundColor: healthBgColor(hi) } : { backgroundColor: GRAY_100 }]}>
            <Text style={styles.deptCardName}>{dept.name}</Text>
            {hi !== null && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={[styles.barContainer, { width: 50, flex: 0 }]}>
                  <View style={[styles.bar, { width: `${hi}%`, backgroundColor: healthColor(hi) }]} />
                </View>
                <Text style={[styles.statusText, { color: healthColor(hi), fontSize: 9 }]}>
                  {hi}% · {healthLabel(hi)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.deptMetaRow}>
            <View style={styles.deptMetaCell}>
              <Text style={styles.deptMetaLabel}>Colaboradores</Text>
              <Text style={styles.deptMetaValue}>{dept.employeeCount}</Text>
            </View>
            <View style={styles.deptMetaCell}>
              <Text style={styles.deptMetaLabel}>Respostas</Text>
              <Text style={styles.deptMetaValue}>{dept.responseCount}</Text>
              <Text style={styles.deptMetaSubValue}>de {dept.totalRecipients} enviados</Text>
            </View>
            <View style={styles.deptMetaCell}>
              <Text style={styles.deptMetaLabel}>Adesão</Text>
              <Text style={[styles.deptMetaValue, { color: adherenceColor(dept.adherencePct) }]}>{dept.adherencePct}%</Text>
              <Text style={styles.deptMetaSubValue}>{dept.adherencePct >= 80 ? "Meta atingida" : dept.adherencePct >= 50 ? "Atenção" : "Abaixo da meta"}</Text>
            </View>
            <View style={[styles.deptMetaCell, { borderRightWidth: 0 }]}>
              <Text style={styles.deptMetaLabel}>Perguntas</Text>
              <Text style={styles.deptMetaValue}>{dept.questions.length}</Text>
              <Text style={styles.deptMetaSubValue}>avaliadas</Text>
            </View>
          </View>

          {dept.questions.length > 0 && (
            <View style={styles.qDistRow}>
              <Text style={styles.qDistLabel}>Distribuição:</Text>
              <View style={styles.qDistItem}>
                <View style={[styles.qDistDot, { backgroundColor: GREEN }]} />
                <Text style={[styles.qDistText, { color: GREEN }]}>{dept.healthyQs}</Text>
                <Text style={styles.qDistSubText}>saudáveis</Text>
              </View>
              <View style={styles.qDistItem}>
                <View style={[styles.qDistDot, { backgroundColor: AMBER }]} />
                <Text style={[styles.qDistText, { color: AMBER }]}>{dept.warningQs}</Text>
                <Text style={styles.qDistSubText}>atenção</Text>
              </View>
              <View style={styles.qDistItem}>
                <View style={[styles.qDistDot, { backgroundColor: RED }]} />
                <Text style={[styles.qDistText, { color: RED }]}>{dept.criticalQs}</Text>
                <Text style={styles.qDistSubText}>críticos</Text>
              </View>
            </View>
          )}

          {(dept.bestQuestion ?? dept.worstQuestion) && (
            <View style={styles.bestWorstRow}>
              {dept.worstQuestion && (
                <View style={styles.bestWorstCell}>
                  <Text style={styles.bestWorstLabel}>Indicador com Maior Risco</Text>
                  <View style={styles.bestWorstContent}>
                    <Text style={styles.bestWorstOrderBadge}>P{dept.worstQuestion.order}</Text>
                    <Text style={styles.bestWorstText}>{dept.worstQuestion.text}</Text>
                    <Text style={[styles.bestWorstScore, { color: healthColor(dept.worstQuestion.healthIndex) }]}>
                      {dept.worstQuestion.healthIndex}%
                    </Text>
                  </View>
                </View>
              )}
              {dept.bestQuestion && (
                <View style={[styles.bestWorstCell, { borderRightWidth: 0 }]}>
                  <Text style={styles.bestWorstLabel}>Melhor Indicador</Text>
                  <View style={styles.bestWorstContent}>
                    <Text style={styles.bestWorstOrderBadge}>P{dept.bestQuestion.order}</Text>
                    <Text style={styles.bestWorstText}>{dept.bestQuestion.text}</Text>
                    <Text style={[styles.bestWorstScore, { color: healthColor(dept.bestQuestion.healthIndex) }]}>
                      {dept.bestQuestion.healthIndex}%
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {sortedQuestions.length > 0 ? (
            <>
              <View style={[styles.tableHeader, { borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }]}>
                <Text style={[styles.tableHeaderCell, { width: 20 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Pergunta</Text>
                <Text style={[styles.tableHeaderCell, { width: 50 }]}>Direção</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>Índice de Saúde</Text>
                <Text style={[styles.tableHeaderCell, { width: 50 }]}>Respostas</Text>
              </View>
              {sortedQuestions.map((q, i) => {
                const qHi = q.healthIndex
                return (
                  <View key={i} style={[styles.questionRow, i % 2 !== 0 ? styles.questionRowAlt : {}]}>
                    <Text style={[styles.tableCell, { width: 20, color: GRAY_500 }]}>P{q.order}</Text>
                    <Text style={styles.questionText}>{q.text}</Text>
                    <Text style={[styles.directionBadge, { width: 50 }]}>{directionLabel(q.scoreDirection)}</Text>
                    <View style={{ width: 80, flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <View style={[styles.barContainer, { width: 40, flex: 0 }]}>
                        <View style={[styles.bar, { width: `${qHi}%`, backgroundColor: healthColor(qHi) }]} />
                      </View>
                      <Text style={[styles.scoreText, { color: healthColor(qHi) }]}>{qHi}%</Text>
                    </View>
                    <Text style={[styles.tableCell, { width: 50 }]}>{q.responseCount} resp.</Text>
                  </View>
                )
              })}
            </>
          ) : (
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 7, color: GRAY_500, textAlign: "center" }}>
                Dados insuficientes (mínimo de 5 respondentes por pergunta).
              </Text>
            </View>
          )}

          {dept.questionDistributions.length > 0 && (
            <>
              <View style={styles.distSectionHeader}>
                <Text style={[styles.tableHeaderCell, { width: 20 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Distribuição de Notas (1–5)</Text>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Text key={s} style={[styles.tableHeaderCell, { width: 36, textAlign: "center" }]}>
                    Nota {s}
                  </Text>
                ))}
              </View>
              {dept.questionDistributions
                .sort((a, b) => a.questionOrder - b.questionOrder)
                .map((dist, i) => {
                  const total = dist.distribution.reduce((sum, d) => sum + d.count, 0)
                  return (
                    <View key={i} style={[styles.distRowQ, i % 2 !== 0 ? styles.distRowQAlt : {}]}>
                      <Text style={[styles.tableCell, { width: 20, color: GRAY_500 }]}>P{dist.questionOrder}</Text>
                      <View style={{ flex: 1, flexDirection: "row", gap: 2 }}>
                        {dist.distribution.map((d) => {
                          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0
                          return (
                            <View key={d.score} style={{ flex: 1, height: 6, backgroundColor: GRAY_200, borderRadius: 2 }}>
                              {pct > 0 && (
                                <View style={{ width: `${pct}%`, height: 6, backgroundColor: scoreColor(d.score), borderRadius: 2 }} />
                              )}
                            </View>
                          )
                        })}
                      </View>
                      {[1, 2, 3, 4, 5].map((s) => {
                        const entry = dist.distribution.find((d) => d.score === s)
                        const count = entry?.count ?? 0
                        return (
                          <Text key={s} style={[styles.tableCell, { width: 36, textAlign: "center", color: count > 0 ? scoreColor(s) : GRAY_200, fontFamily: count > 0 ? FONT_BOLD : "Helvetica" }]}>
                            {count > 0 ? count : "—"}
                          </Text>
                        )
                      })}
                    </View>
                  )
                })}
            </>
          )}
        </View>
      </View>

      <PageFooter orgName={orgName} pageLabel={`Setor: ${dept.name}`} />
    </Page>
  )
}

interface ConsolidatedQuestionsPageProps {
  aggregatedQuestions: PgrPdfAggregatedQuestion[]
  orgName: string
  periodLabel: string
}

function ConsolidatedQuestionsPage({ aggregatedQuestions, orgName, periodLabel }: ConsolidatedQuestionsPageProps): React.ReactElement {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderRow}>
          <View>
            <Text style={styles.brandText}>Pulse · Perguntas Consolidadas</Text>
            <Text style={styles.docTitle}>Relatório PGR — NR-1</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.orgName}>{orgName}</Text>
            <Text style={styles.periodText}>{periodLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Ranking de Perguntas — Visão Organizacional</Text>
        <Text style={{ fontSize: 7, color: GRAY_500, marginBottom: 12, lineHeight: 1.4 }}>
          Todas as perguntas ordenadas pelo Índice de Saúde (menor = maior risco). Dados consolidados de todos os setores.
        </Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: 24 }]}>#</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Pergunta</Text>
          <Text style={[styles.tableHeaderCell, { width: 54 }]}>Direção</Text>
          <Text style={[styles.tableHeaderCell, { width: 84 }]}>Índice de Saúde</Text>
          <Text style={[styles.tableHeaderCell, { width: 50 }]}>Respostas</Text>
          <Text style={[styles.tableHeaderCell, { width: 46 }]}>Status</Text>
        </View>
        {aggregatedQuestions.map((q, i) => (
          <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.tableCell, { width: 24, color: GRAY_500 }]}>P{q.order}</Text>
            <Text style={[styles.questionText, { flex: 1 }]}>{q.text}</Text>
            <Text style={[styles.directionBadge, { width: 54 }]}>{directionLabel(q.scoreDirection)}</Text>
            <View style={{ width: 84, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={[styles.barContainer, { width: 44, flex: 0 }]}>
                <View style={[styles.bar, { width: `${q.healthIndex}%`, backgroundColor: healthColor(q.healthIndex) }]} />
              </View>
              <Text style={[styles.scoreText, { color: healthColor(q.healthIndex) }]}>{q.healthIndex}%</Text>
            </View>
            <Text style={[styles.tableCell, { width: 50 }]}>{q.responseCount}</Text>
            <Text style={[styles.tableCell, { width: 46, color: healthColor(q.healthIndex), fontFamily: FONT_BOLD, fontSize: 6 }]}>
              {healthLabel(q.healthIndex)}
            </Text>
          </View>
        ))}
      </View>

      <PageFooter orgName={orgName} pageLabel="Perguntas Consolidadas" />
    </Page>
  )
}

interface MethodologyPageProps {
  orgName: string
  periodLabel: string
  generatedAt: Date
}

function MethodologyPage({ orgName, periodLabel, generatedAt }: MethodologyPageProps): React.ReactElement {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderRow}>
          <View>
            <Text style={styles.brandText}>Pulse · Metodologia e Conformidade</Text>
            <Text style={styles.docTitle}>Relatório PGR — NR-1</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.orgName}>{orgName}</Text>
            <Text style={styles.periodText}>{periodLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Contexto Regulatório</Text>

        <View style={styles.methodologyBox}>
          <Text style={styles.methodologyTitle}>NR-1 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais</Text>
          <Text style={styles.methodologyText}>
            A Norma Regulamentadora nº 1 (NR-1), atualizada em 2024 e com vigência a partir de maio de 2026, exige que
            as empresas incluam no Programa de Gerenciamento de Riscos (PGR) a identificação e controle de fatores de
            risco psicossocial — incluindo estresse ocupacional, sobrecarga de trabalho e clima organizacional.
            Este relatório constitui evidência documental do cumprimento desta exigência.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Metodologia de Coleta</Text>

        <View style={styles.methodologyBox}>
          <Text style={styles.methodologyTitle}>Pesquisas Periódicas por Setor</Text>
          <Text style={styles.methodologyText}>
            O Pulse envia pesquisas curtas e anônimas aos colaboradores via SMS ou WhatsApp, de acordo com a
            frequência configurada por setor (diária, semanal, quinzenal ou mensal). As pesquisas são enviadas
            apenas dentro do horário de expediente de cada setor.{"\n\n"}
            Cada pergunta utiliza escala Likert de 1 a 5 pontos. A direção da escala é configurável por pergunta:
            para questões de bem-estar (ex: "Como você se sente?"), nota 5 = melhor. Para questões de risco (ex:
            "Com que frequência se sente sobrecarregado?"), nota 1 = melhor.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Cálculo do Índice de Saúde</Text>

        <View style={styles.methodologyBox}>
          <Text style={styles.methodologyTitle}>Fórmula e Interpretação</Text>
          <Text style={styles.methodologyText}>
            {"Índice de Saúde = ((Nota Média – 1) / 4) × 100\n\n"}
            {"• Saudável (≥ 62%): risco psicossocial baixo — sem intervenção urgente necessária\n"}
            {"• Atenção (37%–61%): risco moderado — monitoramento próximo e plano de ação recomendado\n"}
            {"• Crítico (< 37%): risco elevado — intervenção urgente necessária\n\n"}
            Para garantir anonimato, métricas por setor são exibidas apenas quando há mínimo de 5 respondentes.
            Notas de perguntas com direção "menor melhor" são invertidas antes do cálculo.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Conformidade com a LGPD</Text>

        <View style={styles.methodologyBox}>
          <Text style={styles.methodologyTitle}>Proteção de Dados e Anonimato</Text>
          <Text style={styles.methodologyText}>
            {"• Todas as respostas são completamente anônimas — nenhuma resposta é vinculada a um colaborador\n"}
            {"• Os colaboradores aceitaram o TCLE (Termo de Consentimento Livre e Esclarecido) antes de participar\n"}
            {"• Dados coletados apenas dentro do horário de expediente configurado\n"}
            {"• Armazenamento em conformidade com a LGPD (Lei nº 13.709/2018)\n"}
            {"• CPF coletado apenas como hash SHA-256 no momento do aceite do TCLE"}
          </Text>
        </View>

        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: GRAY_200, paddingTop: 12 }}>
          <Text style={{ fontSize: 7, color: GRAY_500, textAlign: "center", lineHeight: 1.5 }}>
            Relatório gerado automaticamente pelo sistema Pulse em {formatDateTime(generatedAt)}.{"\n"}
            Este documento é de uso interno e serve como evidência documental para o PGR.{"\n"}
            Pulse — Monitoramento de Saúde Ocupacional · NR-1 Conformidade
          </Text>
        </View>
      </View>

      <PageFooter orgName={orgName} pageLabel="Metodologia e Conformidade" />
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
      {data.aggregatedQuestions.length > 0 && (
        <ConsolidatedQuestionsPage
          aggregatedQuestions={data.aggregatedQuestions}
          orgName={data.orgName}
          periodLabel={data.periodLabel}
        />
      )}
      <MethodologyPage orgName={data.orgName} periodLabel={data.periodLabel} generatedAt={data.generatedAt} />
    </Document>
  )
}

export async function generatePgrPdf(data: PgrPdfInput): Promise<Buffer> {
  const element = React.createElement(PgrDocument, { data }) as React.ReactElement<DocumentProps>
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
