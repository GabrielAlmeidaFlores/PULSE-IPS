"use client"

import { useState } from "react"

interface Tab {
  id: string
  label: string
  badge?: number
}

interface PgrTabsLayoutProps {
  tabs: Tab[]
  overview: React.ReactNode
  byDept: React.ReactNode
  consolidated: React.ReactNode
}

export function PgrTabsLayout({
  tabs,
  overview,
  byDept,
  consolidated,
}: PgrTabsLayoutProps): React.ReactElement {
  const [active, setActive] = useState<string>(tabs[0]?.id ?? "overview")

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-card flex shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`relative px-5 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              active === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-black bg-muted text-muted-foreground">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {active === "overview" && overview}
        {active === "byDept" && byDept}
        {active === "consolidated" && consolidated}
      </div>
    </div>
  )
}
