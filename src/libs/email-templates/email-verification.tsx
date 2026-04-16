interface EmailVerificationProps {
  verificationUrl: string
}

export function EmailVerificationEmail({
  verificationUrl,
}: EmailVerificationProps): React.ReactElement {
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Verify your email address</h1>
      <p>Please verify your email address to complete your Pulse account setup.</p>
      <a
        href={verificationUrl}
        style={{
          display: "inline-block",
          padding: "12px 24px",
          backgroundColor: "#0f172a",
          color: "#ffffff",
          textDecoration: "none",
          borderRadius: "6px",
        }}
      >
        Verify Email
      </a>
    </div>
  )
}
