import { StorefrontView, type StorefrontOffer } from "@/components/storefront/storefront-view"

const MOCK_ORG = {
  name: "Edge Performance",
  branding: {
    logo_url: null as string | null,
    bio: "Personalized coaching programs to reach your full potential. Science-backed methods, real results.",
    primary_color: "#e07b39",
  },
}

const MOCK_OFFERS: StorefrontOffer[] = [
  {
    id: 1,
    title: "Technical Assessment",
    description:
      "A complete analysis session to identify your strengths and areas for improvement.",
    price: 14900,
    currency: "eur",
    interval: null,
    installment_count: null,
    billing_type: "one_time",
    key_features: [
      "60-min video analysis",
      "Detailed PDF report",
      "Personalised action plan",
    ],
  },
  {
    id: 2,
    title: "Intensive Coaching",
    description:
      "Full monthly coaching with weekly sessions and access to all content libraries.",
    price: 24900,
    currency: "eur",
    interval: "month",
    installment_count: null,
    billing_type: "subscription",
    key_features: [
      "4 live sessions / month",
      "Access to video programs",
      "Private group chat",
      "Monthly written review",
    ],
  },
  {
    id: 3,
    title: "3-Month Block",
    description:
      "A structured 12-week block for a lasting transformation in your performance.",
    price: 69900,
    currency: "eur",
    interval: null,
    installment_count: 3,
    billing_type: "installment",
    key_features: [
      "12 weeks of coaching",
      "Progress checkpoints",
      "Full content access",
    ],
  },
]

export default function OrgPreviewPage() {
  return (
    <StorefrontView
      name={MOCK_ORG.name}
      logoUrl={MOCK_ORG.branding.logo_url}
      bio={MOCK_ORG.branding.bio}
      primaryColor={MOCK_ORG.branding.primary_color}
      offers={MOCK_OFFERS}
      buyHrefBase="/org/preview/buy"
      banner="Preview mock store page"
    />
  )
}
