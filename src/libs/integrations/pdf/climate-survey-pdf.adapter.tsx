import React from "react"
import { Document, Page, View, Text, StyleSheet, renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import type { ClimateSurveyPdfInput, ClimateSurveyPdfTopic } from "@/libs/integrations/pdf/climate-survey-pdf.types"

const FONT_BOLD = "Helvetica-Bold"
const BRAND = "#3DB98A"
const BRAND_DARK = "#1a1a2e"
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

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    paddingBottom: 52,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
  },
  footerText: { fontSize: 7, color: GRAY_500, letterSpacing: 0.5 },
  cover: {
    backgroundColor: BRAND_DARK,
    paddingHorizontal: 44,
    paddingTop: 64,
    paddingBottom: 44,
  },
  coverBrand: { fontSize: 26, fontFamily: FONT_BOLD, color: BRAND, letterSpacing: 1 },
  coverBrandLight: { fontSize: 26, fontFamily: "Helvetica", color: "#ffffff", letterSpacing: 6 },
  coverDoc: { fontSize: 9, color: "#6ee7b7", letterSpacing: 3, textTransform: "uppercase", marginTop: 18 },
  coverTitle: { fontSize: 24, fontFamily: FONT_BOLD, color: "#ffffff", marginTop: 10, lineHeight: 1.25 },
  coverMeta: { fontSize: 10, color: GRAY_200, marginTop: 10 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 36, marginTop: 24 },
  kpiCard: {
    width: "48%",
    marginRight: "2%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: GRAY_200,
    backgroundColor: GRAY_50,
    padding: 14,
  },
  kpiLabel: { fontSize: 7, color: GRAY_500, letterSpacing: 1, textTransform: "uppercase" },
  kpiValue: { fontSize: 24, fontFamily: FONT_BOLD, color: GRAY_900, marginTop: 6 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    color: GRAY_900,
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 36,
    marginTop: 26,
  },
  sectionSubtitle: { fontSize: 8, color: GRAY_500, paddingHorizontal: 36, marginTop: 3 },
  chartArea: { paddingHorizontal: 36, marginTop: 12 },
  barRow: { marginBottom: 9 },
  barRowHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  barLabel: { fontSize: 8, color: GRAY_700, maxWidth: "78%" },
  barValue: { fontSize: 8, fontFamily: FONT_BOLD, color: GRAY_900 },
  barTrack: { height: 12, backgroundColor: GRAY_100, position: "relative" },
  barFill: { height: 12 },
  goalMarker: {
    position: "absolute",
    top: -2,
    width: 1,
    height: 16,
    backgroundColor: AMBER,
  },
  enpsRow: { flexDirection: "row", height: 22, marginTop: 8 },
  enpsSegment: { height: 22, alignItems: "center", justifyContent: "center" },
  enpsLegend: { flexDirection: "row", marginTop: 8 },
  enpsLegendItem: { flexDirection: "row", alignItems: "center", marginRight: 18 },
  enpsDot: { width: 8, height: 8, marginRight: 5 },
  enpsLegendText: { fontSize: 8, color: GRAY_700 },
  table: { paddingHorizontal: 36, marginTop: 12 },
  tableRow: { flexDirection: "row" },
  thTopic: {
    width: "34%",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
    borderRightWidth: 1,
    borderRightColor: GRAY_200,
  },
  th: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
    borderRightWidth: 1,
    borderRightColor: GRAY_200,
    alignItems: "center",
  },
  thText: { fontSize: 7, fontFamily: FONT_BOLD, color: GRAY_500, textTransform: "uppercase" },
  tdTopic: {
    width: "34%",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
    borderRightWidth: 1,
    borderRightColor: GRAY_200,
    justifyContent: "center",
  },
  tdCell: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
    borderRightWidth: 1,
    borderRightColor: GRAY_200,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  cellBox: { paddingVertical: 3, paddingHorizontal: 6, borderWidth: 1 },
  cellText: { fontSize: 8, fontFamily: FONT_BOLD },
  deptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
    paddingVertical: 6,
  },
  deptName: { fontSize: 9, color: GRAY_700 },
  deptValue: { fontSize: 9, fontFamily: FONT_BOLD, color: GRAY_900 },
})

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`
}

function formatEnps(value: number | null): string {
  if (value === null) return "—"
  return value > 0 ? `+${value}` : String(value)
}

function favorabilityColors(percent: number, goalPercent: number): { bg: string; border: string; text: string } {
  if (percent >= goalPercent + 5) return { bg: GREEN_LIGHT, border: GREEN_BORDER, text: GREEN }
  if (percent >= goalPercent) return { bg: "#f0fdf4", border: GREEN_BORDER, text: GREEN }
  if (percent >= goalPercent - 10) return { bg: AMBER_LIGHT, border: AMBER_BORDER, text: AMBER }
  return { bg: RED_LIGHT, border: RED_BORDER, text: RED }
}

function barColor(percent: number, goalPercent: number): string {
  if (percent >= goalPercent) return GREEN
  if (percent >= goalPercent - 10) return AMBER
  return RED
}

function sortTopicsDescending(topics: ClimateSurveyPdfTopic[]): ClimateSurveyPdfTopic[] {
  return [...topics].sort((a, b) => (b.favorabilityPercent ?? -1) - (a.favorabilityPercent ?? -1))
}

function Footer({ orgName, pageLabel }: { orgName: string; pageLabel: string }): React.ReactElement {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{orgName} · Relatório de Clima · Pulse</Text>
      <Text style={styles.footerText}>{pageLabel}</Text>
    </View>
  )
}

export function generateClimateSurveyPdf(data: ClimateSurveyPdfInput): Promise<Buffer> {
  const sortedTopics = sortTopicsDescending(data.topics)
  const generatedLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data.generatedAt)

  const doc = (
    <Document title={`Relatório de Clima — ${data.waveLabel}`} author="Pulse">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.cover}>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.coverBrand}>PULSE</Text>
            <Text style={styles.coverBrandLight}> IPS</Text>
          </View>
          <Text style={styles.coverDoc}>Relatório de Clima Organizacional</Text>
          <Text style={styles.coverTitle}>{data.orgName}</Text>
          <Text style={styles.coverMeta}>{data.waveLabel}</Text>
          <Text style={styles.coverMeta}>Período de coleta: {data.periodLabel}</Text>
          <Text style={styles.coverMeta}>Emitido em {generatedLabel}</Text>
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Adesão</Text>
            <Text style={styles.kpiValue}>{data.kpis.adherencePercent}%</Text>
            <Text style={styles.kpiLabel}>
              {data.kpis.totalResponses} de {data.kpis.totalRecipients} colaboradores
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Favorabilidade</Text>
            <Text style={styles.kpiValue}>{formatPercent(data.kpis.favorabilityPercent)}</Text>
            <Text style={styles.kpiLabel}>Meta {data.goalPercent}%</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>eNPS</Text>
            <Text style={styles.kpiValue}>{formatEnps(data.kpis.enps)}</Text>
            <Text style={styles.kpiLabel}>Promotores − detratores</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Tópicos abaixo da meta</Text>
            <Text style={styles.kpiValue}>
              {data.kpis.topicsBelowGoal} / {data.kpis.totalTopics}
            </Text>
            <Text style={styles.kpiLabel}>Meta {data.goalPercent}%</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Favorabilidade por tópico</Text>
        <Text style={styles.sectionSubtitle}>Linha vertical = meta de {data.goalPercent}%</Text>
        <View style={styles.chartArea}>
          {sortedTopics.map((topic) => {
            const value = topic.favorabilityPercent
            return (
              <View key={topic.label} style={styles.barRow} wrap={false}>
                <View style={styles.barRowHead}>
                  <Text style={styles.barLabel}>{topic.label}</Text>
                  <Text style={styles.barValue}>{formatPercent(value)}</Text>
                </View>
                <View style={styles.barTrack}>
                  {value !== null && (
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.min(Math.max(value, 0), 100)}%`, backgroundColor: barColor(value, data.goalPercent) },
                      ]}
                    />
                  )}
                  <View style={[styles.goalMarker, { left: `${data.goalPercent}%` }]} />
                </View>
              </View>
            )
          })}
        </View>

        <Text style={styles.sectionTitle}>eNPS</Text>
        <Text style={styles.sectionSubtitle}>
          {data.enps.total} respondentes · {data.enps.promoters} promotores · {data.enps.neutrals} neutros ·{" "}
          {data.enps.detractors} detratores
        </Text>
        <View style={styles.chartArea}>
          <View style={styles.enpsRow}>
            {data.enps.total > 0 && (
              <>
                <View style={[styles.enpsSegment, { width: `${(data.enps.promoters / data.enps.total) * 100}%`, backgroundColor: GREEN }]} />
                <View style={[styles.enpsSegment, { width: `${(data.enps.neutrals / data.enps.total) * 100}%`, backgroundColor: GRAY_500 }]} />
                <View style={[styles.enpsSegment, { width: `${(data.enps.detractors / data.enps.total) * 100}%`, backgroundColor: RED }]} />
              </>
            )}
          </View>
          <View style={styles.enpsLegend}>
            <View style={styles.enpsLegendItem}>
              <View style={[styles.enpsDot, { backgroundColor: GREEN }]} />
              <Text style={styles.enpsLegendText}>Promotores</Text>
            </View>
            <View style={styles.enpsLegendItem}>
              <View style={[styles.enpsDot, { backgroundColor: GRAY_500 }]} />
              <Text style={styles.enpsLegendText}>Neutros</Text>
            </View>
            <View style={styles.enpsLegendItem}>
              <View style={[styles.enpsDot, { backgroundColor: RED }]} />
              <Text style={styles.enpsLegendText}>Detratores</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Favorabilidade por tópico × setor</Text>
        <Text style={styles.sectionSubtitle}>Células com amostra insuficiente não exibem valor</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.thTopic}>
              <Text style={styles.thText}>Tópico</Text>
            </View>
            {data.heatmap.departments.map((department) => (
              <View key={department} style={styles.th}>
                <Text style={styles.thText}>{department}</Text>
              </View>
            ))}
          </View>
          {data.heatmap.rows.map((row) => (
            <View key={row.topic} style={styles.tableRow} wrap={false}>
              <View style={styles.tdTopic}>
                <Text style={{ fontSize: 8, color: GRAY_700 }}>{row.topic}</Text>
              </View>
              {row.values.map((value, index) => {
                const colors = value === null ? null : favorabilityColors(value, data.goalPercent)
                return (
                  <View key={`${row.topic}-${data.heatmap.departments[index] ?? index}`} style={styles.tdCell}>
                    <View
                      style={[
                        styles.cellBox,
                        colors !== null
                          ? { backgroundColor: colors.bg, borderColor: colors.border }
                          : { backgroundColor: GRAY_100, borderColor: GRAY_200 },
                      ]}
                    >
                      <Text style={[styles.cellText, { color: colors !== null ? colors.text : GRAY_500 }]}>
                        {formatPercent(value)}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Consolidado por setor</Text>
        <Text style={styles.sectionSubtitle}>Favorabilidade e eNPS por setor</Text>
        <View style={styles.table}>
          {data.departments.map((department) => (
            <View key={department.name} style={styles.deptRow} wrap={false}>
              <Text style={styles.deptName}>
                {department.name} · {department.respondentCount} respondentes
              </Text>
              <Text style={styles.deptValue}>
                {formatPercent(department.favorabilityPercent)} · eNPS {formatEnps(department.enps)}
              </Text>
            </View>
          ))}
        </View>

        <Footer orgName={data.orgName} pageLabel={`${data.waveLabel} · ${generatedLabel}`} />
      </Page>
    </Document>
  )

  return renderToBuffer(doc as React.ReactElement<DocumentProps>)
}
