interface PlanSubscribedProps {
  orgName: string
  planName: string
  priceFormatted: string
  interval: string
}

export function PlanSubscribedEmail({
  orgName,
  planName,
  priceFormatted,
  interval,
}: PlanSubscribedProps): React.ReactElement {
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Subscription confirmed</h1>
      <p>
        Thank you! <strong>{orgName}</strong> is now subscribed to the{" "}
        <strong>{planName}</strong> plan.
      </p>
      <p>
        You will be billed <strong>{priceFormatted}</strong> per <strong>{interval}</strong>.
      </p>
    </div>
  )
}
