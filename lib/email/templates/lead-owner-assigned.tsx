import * as React from "react"

export type LeadOwnerAssignedField = {
  label: string
  value: string
}

type Props = {
  ownerName?: string | null
  assignerName?: string | null
  orgName?: string | null
  leadName: string
  leadEmail: string
  leadPhone?: string | null
  leadStatus: string
  formTitle?: string | null
  offerTitle?: string | null
  fields: LeadOwnerAssignedField[]
  leadUrl: string
}

const cardStyle: React.CSSProperties = {
  maxWidth: 520,
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

const sectionLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#71717a",
}

const fieldLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 500,
  color: "#52525b",
  lineHeight: 1.4,
}

const valueStyle: React.CSSProperties = {
  margin: "2px 0 0",
  fontSize: 14,
  color: "#18181b",
  lineHeight: 1.4,
}

const footerStyle: React.CSSProperties = {
  margin: "24px 0 0",
  fontSize: 13,
  color: "#71717a",
}

function capitalizeStatus(status: string): string {
  const trimmed = status.trim()
  if (trimmed.length === 0) return status
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export function LeadOwnerAssignedEmail({
  ownerName,
  assignerName,
  orgName,
  leadName,
  leadEmail,
  leadPhone,
  leadStatus,
  formTitle,
  offerTitle,
  fields,
  leadUrl,
}: Props) {
  const intro =
    assignerName && orgName
      ? `${assignerName} assigned you as owner of a lead at ${orgName}.`
      : assignerName
        ? `${assignerName} assigned you as owner of a lead on CoachStack.`
        : orgName
          ? `You were assigned as owner of a lead at ${orgName}.`
          : "You were assigned as owner of a lead on CoachStack."

  return (
    <div
      style={{
        margin: 0,
        padding: "40px 20px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        backgroundColor: "#f4f4f5",
        lineHeight: 1.5,
      }}
    >
      <div style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <span style={logoStyle}>C</span>
          <span style={logoTextStyle}>CoachStack</span>
        </div>
        <h1 style={headingStyle}>
          {ownerName ? `${ownerName}, you own this lead` : "You own this lead"}
        </h1>
        <p style={bodyStyle}>{intro}</p>

        <div
          style={{
            margin: "0 0 20px",
            padding: "14px 16px",
            borderRadius: 10,
            backgroundColor: "#f4f4f5",
          }}
        >
          <p style={sectionLabelStyle}>Lead</p>
          <p style={{ ...valueStyle, fontSize: 16, fontWeight: 600 }}>{leadName}</p>
          <p style={{ ...valueStyle, marginTop: 8 }}>{leadEmail}</p>
          {leadPhone ? <p style={valueStyle}>{leadPhone}</p> : null}
          <p style={{ ...valueStyle, marginTop: 10 }}>
            Status: <strong>{capitalizeStatus(leadStatus)}</strong>
          </p>
          {formTitle ? (
            <p style={valueStyle}>
              Form: <strong>{formTitle}</strong>
            </p>
          ) : null}
          {offerTitle ? (
            <p style={valueStyle}>
              Offer: <strong>{offerTitle}</strong>
            </p>
          ) : null}

          {fields.length > 0 ? (
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid #e4e4e7",
              }}
            >
              <p style={{ ...sectionLabelStyle, marginBottom: 10 }}>Form answers</p>
              <div style={{ display: "grid", gap: 10 }}>
                {fields.map((field) => (
                  <div key={field.label}>
                    <p style={fieldLabelStyle}>{field.label}</p>
                    <p style={valueStyle}>{field.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <p style={{ margin: "24px 0" }}>
          <a
            href={leadUrl}
            style={{
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: 9999,
              backgroundColor: "#111827",
              color: "#f9fafb",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Open lead in CRM
          </a>
        </p>
        <p style={footerStyle}>
          Owning a lead means you follow up.
        </p>
      </div>
      <p style={{ margin: "24px 0 0", fontSize: 12, color: "#a1a1aa", textAlign: "center" }}>
        CoachStack — coaching made simple
      </p>
    </div>
  )
}
