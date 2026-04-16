import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import { Toaster } from "sonner"
import { NuqsAdapter } from "nuqs/adapters/next/app"
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
          <NuqsAdapter>
            {children}
          </NuqsAdapter>
          <Toaster position="top-right" theme="light" richColors />
        </body>
    </html>
  )
}
