interface PaymentFailedProps {
  orgName: string
  portalUrl: string
}

export function PaymentFailedEmail({ orgName, portalUrl }: PaymentFailedProps): React.ReactElement {
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Payment failed</h1>
      <p>
        The payment for <strong>{orgName}</strong>&apos;s Pulse subscription has failed.
      </p>
      <p>Please update your payment method to avoid service interruption.</p>
      <a
        href={portalUrl}
        style={{
          display: "inline-block",
          padding: "12px 24px",
          backgroundColor: "#dc2626",
          color: "#ffffff",
          textDecoration: "none",
          borderRadius: "6px",
        }}
      >
        Update Payment Method
      </a>
    </div>
  )
}
