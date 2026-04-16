interface OrgInviteProps {
  orgName: string
  inviteUrl: string
  role: string
}

export function OrgInviteEmail({ orgName, inviteUrl, role }: OrgInviteProps): React.ReactElement {
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1>You have been invited to {orgName}</h1>
      <p>
        You have been invited to join <strong>{orgName}</strong> as <strong>{role}</strong> on the
        Pulse platform.
      </p>
      <a
        href={inviteUrl}
        style={{
          display: "inline-block",
          padding: "12px 24px",
          backgroundColor: "#0f172a",
          color: "#ffffff",
          textDecoration: "none",
          borderRadius: "6px",
        }}
      >
        Accept Invitation
      </a>
      <p style={{ color: "#64748b", fontSize: "14px" }}>This invitation expires in 7 days.</p>
    </div>
  )
}
