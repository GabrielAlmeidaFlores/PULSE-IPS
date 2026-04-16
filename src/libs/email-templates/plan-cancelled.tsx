interface PlanCancelledProps {
  orgName: string
  endDate: string
}

export function PlanCancelledEmail({ orgName, endDate }: PlanCancelledProps): React.ReactElement {
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Subscription cancelled</h1>
      <p>
        The Pulse subscription for <strong>{orgName}</strong> has been cancelled.
      </p>
      <p>
        Your access will continue until <strong>{endDate}</strong>.
      </p>
    </div>
  )
}
