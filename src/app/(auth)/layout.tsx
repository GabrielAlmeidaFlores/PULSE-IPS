export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, var(--color-primary) 0px, var(--color-primary) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, var(--color-primary) 0px, var(--color-primary) 1px, transparent 1px, transparent 40px)`,
        }}
      />
      <div className="relative w-full max-w-md px-6 py-12">{children}</div>
    </div>
  )
}
