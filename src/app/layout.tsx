import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import { cookies } from "next/headers"
import { Toaster } from "sonner"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ThemeProvider } from "@/components/theme-provider"
import "@/app/globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "Pulse",
  description: "Employee wellness platform",
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default async function RootLayout({ children }: RootLayoutProps): Promise<React.ReactElement> {
  const cookieStore = await cookies()
  const isDark = cookieStore.get("pulse:theme")?.value === "dark"

  return (
    <html
      lang="pt-BR"
      className={`${poppins.variable} h-full antialiased${isDark ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <NuqsAdapter>
            {children}
          </NuqsAdapter>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
