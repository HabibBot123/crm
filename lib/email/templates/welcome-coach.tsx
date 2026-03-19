export type WelcomeCoachProps = {
  name?: string | null
}

const cardStyle: React.CSSProperties = {
  maxWidth: 480,
  backgroundColor: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  padding: "40px 32px",
}

const logoStyle: React.CSSProperties = {
  display: "inline-block",
  width: 40,
  height: 40,
  lineHeight: "40px",
  textAlign: "center",
  backgroundColor: "#3b82f6",
  color: "#ffffff",
  fontSize: 18,
  fontWeight: "bold",
  borderRadius: 10,
}

const logoTextStyle: React.CSSProperties = {
  marginLeft: 8,
  fontSize: 20,
  fontWeight: 700,
  color: "#18181b",
}

const headingStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 22,
  fontWeight: 600,
  color: "#18181b",
}

const bodyStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 15,
  color: "#52525b",
  lineHeight: 1.5,
}

const footerStyle: React.CSSProperties = {
  margin: "24px 0 0",
  fontSize: 13,
  color: "#71717a",
}

export function WelcomeCoachEmail({ name }: WelcomeCoachProps) {
  const greeting = name ? `Hi ${name},` : "Hi,"
  return (
    <div
      style={{
        margin: 0,
        padding: "40px 20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        backgroundColor: "#f4f4f5",
        lineHeight: 1.5,
      }}
    >
      <div style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <span style={logoStyle}>C</span>
          <span style={logoTextStyle}>CoachStack</span>
        </div>
        <h1 style={headingStyle}>Welcome to CoachStack</h1>
        <p style={bodyStyle}>{greeting}</p>
        <p style={bodyStyle}>
          Your coach account is set up. You can now create your organization, add offers, and start selling.
        </p>
        <p style={bodyStyle}>If you have any questions, we&apos;re here to help.</p>
        <p style={footerStyle}>— The CoachStack team</p>
      </div>
      <p style={{ margin: "24px 0 0", fontSize: 12, color: "#a1a1aa", textAlign: "center" }}>
        CoachStack — coaching made simple
      </p>
    </div>
  )
}
