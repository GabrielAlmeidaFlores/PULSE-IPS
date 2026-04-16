interface PasswordResetProps {
  resetUrl: string
}

export function PasswordResetEmail({ resetUrl }: PasswordResetProps): React.ReactElement {
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Reset your password</h1>
      <p>You requested a password reset. Click the button below to set a new password.</p>
      <a
        href={resetUrl}
        style={{
          display: "inline-block",
          padding: "12px 24px",
          backgroundColor: "#0f172a",
          color: "#ffffff",
          textDecoration: "none",
          borderRadius: "6px",
        }}
      >
        Reset Password
      </a>
      <p style={{ color: "#64748b", fontSize: "14px" }}>
        This link expires in 1 hour. If you did not request this, please ignore this email.
      </p>
    </div>
  )
}
