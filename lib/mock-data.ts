// ============================================================
// MOCK DATA FOR COACHPRO PLATFORM
// ============================================================

export interface Organization {
  id: string
  name: string
  slug: string
  logo: string
  primaryColor: string
  plan: "free" | "pro" | "business"
  memberCount: number
}

export interface Product {
  id: string
  title: string
  description: string
  type: "course" | "ebook" | "coaching"
  price: number
  currency: string
  status: "published" | "draft" | "archived"
  studentsCount: number
  rating: number
  image: string
  modules: Module[]
  pricingType: "one-time" | "monthly" | "yearly" | "free"
}

export interface Module {
  id: string
  title: string
  order: number
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  type: "video" | "ebook" | "text"
  duration?: string
  completed?: boolean
  order: number
}

export interface Client {
  id: string
  name: string
  email: string
  avatar: string
  status: "active" | "inactive" | "churned"
  tags: string[]
  assignedTo: string
  joinedAt: string
  revenue: number
  productsOwned: number
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: "owner" | "admin" | "sales" | "ambassador"
  avatar: string
  joinedAt: string
}

/** Coach: visible to clients in the coaching area. A client can be subscribed to multiple coaches. */
export interface Coach {
  id: string
  name: string
  title: string
  bio: string
  avatar: string
  /** Product IDs this coach offers (courses, coaching programs, etc.) */
  productIds: string[]
  rating: number
  clientsCount: number
  /** Optional tagline for cards */
  tagline?: string
}

/** Current client's subscribed coach IDs (in real app this comes from auth/session). */
export const currentClientCoachIds: string[] = ["1", "2"]

export interface Offer {
  id: string
  name: string
  type: "one-time" | "subscription" | "bundle"
  price: number
  interval?: "monthly" | "yearly"
  products: string[]
  status: "active" | "inactive"
  redemptions: number
}

export const organizations: Organization[] = [
  { id: "1", name: "FitPro Academy", slug: "fitpro", logo: "FP", primaryColor: "#3b82f6", plan: "business", memberCount: 5 },
  { id: "2", name: "MindShift Coaching", slug: "mindshift", logo: "MS", primaryColor: "#10b981", plan: "pro", memberCount: 3 },
  { id: "3", name: "Creative Studio", slug: "creative", logo: "CS", primaryColor: "#f59e0b", plan: "free", memberCount: 1 },
]

export const products: Product[] = [
  {
    id: "1",
    title: "Complete Fitness Transformation",
    description: "12-week comprehensive fitness program with video workouts, nutrition plans, and weekly coaching calls.",
    type: "course",
    price: 297,
    currency: "USD",
    status: "published",
    studentsCount: 342,
    rating: 4.8,
    image: "/images/course-fitness.jpg",
    pricingType: "one-time",
    modules: [
      {
        id: "m1", title: "Foundation & Mindset", order: 1, lessons: [
          { id: "l1", title: "Welcome & Program Overview", type: "video", duration: "12:30", order: 1, completed: true },
          { id: "l2", title: "Setting Your Goals", type: "video", duration: "18:45", order: 2, completed: true },
          { id: "l3", title: "Nutrition Fundamentals Guide", type: "ebook", order: 3, completed: false },
        ]
      },
      {
        id: "m2", title: "Week 1-4: Building Habits", order: 2, lessons: [
          { id: "l4", title: "Day 1 Workout", type: "video", duration: "45:00", order: 1, completed: false },
          { id: "l5", title: "Meal Prep Basics", type: "text", order: 2, completed: false },
          { id: "l6", title: "Progress Tracking Sheet", type: "ebook", order: 3, completed: false },
        ]
      },
      {
        id: "m3", title: "Week 5-8: Acceleration", order: 3, lessons: [
          { id: "l7", title: "Advanced HIIT Training", type: "video", duration: "38:20", order: 1, completed: false },
          { id: "l8", title: "Supplement Guide", type: "ebook", order: 2, completed: false },
        ]
      },
      {
        id: "m4", title: "Week 9-12: Peak Performance", order: 4, lessons: [
          { id: "l9", title: "Competition Prep", type: "video", duration: "52:10", order: 1, completed: false },
          { id: "l10", title: "Maintenance Plan", type: "text", order: 2, completed: false },
        ]
      },
    ]
  },
  {
    id: "2",
    title: "Mindfulness Mastery",
    description: "A complete guide to building a daily meditation practice and reducing stress through mindfulness.",
    type: "ebook",
    price: 49,
    currency: "USD",
    status: "published",
    studentsCount: 1205,
    rating: 4.9,
    image: "/images/course-mindfulness.jpg",
    pricingType: "one-time",
    modules: [
      {
        id: "m5", title: "Getting Started", order: 1, lessons: [
          { id: "l11", title: "Introduction to Mindfulness", type: "text", order: 1 },
          { id: "l12", title: "Your First Meditation", type: "video", duration: "10:00", order: 2 },
        ]
      },
    ]
  },
  {
    id: "3",
    title: "1:1 Executive Coaching",
    description: "Personal coaching sessions for executives looking to level up their leadership skills.",
    type: "coaching",
    price: 199,
    currency: "USD",
    status: "published",
    studentsCount: 28,
    rating: 5.0,
    image: "/images/course-coaching.jpg",
    pricingType: "monthly",
    modules: [
      {
        id: "m6", title: "Onboarding", order: 1, lessons: [
          { id: "l13", title: "Welcome Packet", type: "ebook", order: 1 },
          { id: "l14", title: "Goal Setting Session", type: "video", duration: "60:00", order: 2 },
        ]
      },
    ]
  },
  {
    id: "4",
    title: "Social Media Growth Blueprint",
    description: "Learn how to grow your online presence and attract clients through social media.",
    type: "course",
    price: 0,
    currency: "USD",
    status: "draft",
    studentsCount: 0,
    rating: 0,
    image: "/images/course-social.jpg",
    pricingType: "free",
    modules: [],
  }
]

export const clients: Client[] = [
  { id: "1", name: "Sarah Johnson", email: "sarah@example.com", avatar: "SJ", status: "active", tags: ["VIP", "Fitness"], assignedTo: "Coach Alex", joinedAt: "2025-10-15", revenue: 594, productsOwned: 2 },
  { id: "2", name: "Michael Chen", email: "michael@example.com", avatar: "MC", status: "active", tags: ["Fitness"], assignedTo: "Coach Alex", joinedAt: "2025-11-02", revenue: 297, productsOwned: 1 },
  { id: "3", name: "Emily Davis", email: "emily@example.com", avatar: "ED", status: "active", tags: ["Coaching", "VIP"], assignedTo: "Coach Alex", joinedAt: "2025-09-20", revenue: 1194, productsOwned: 3 },
  { id: "4", name: "James Wilson", email: "james@example.com", avatar: "JW", status: "inactive", tags: ["Ebook"], assignedTo: "Sales Rep", joinedAt: "2025-08-10", revenue: 49, productsOwned: 1 },
  { id: "5", name: "Lisa Park", email: "lisa@example.com", avatar: "LP", status: "active", tags: ["Fitness", "Coaching"], assignedTo: "Coach Alex", joinedAt: "2025-12-01", revenue: 496, productsOwned: 2 },
  { id: "6", name: "David Brown", email: "david@example.com", avatar: "DB", status: "churned", tags: ["Fitness"], assignedTo: "Sales Rep", joinedAt: "2025-06-15", revenue: 297, productsOwned: 1 },
  { id: "7", name: "Amanda White", email: "amanda@example.com", avatar: "AW", status: "active", tags: ["VIP", "Coaching"], assignedTo: "Coach Alex", joinedAt: "2025-11-18", revenue: 796, productsOwned: 2 },
]

export const teamMembers: TeamMember[] = [
  { id: "1", name: "Alex Thompson", email: "alex@fitpro.com", role: "owner", avatar: "AT", joinedAt: "2024-01-01" },
  { id: "2", name: "Jordan Cruz", email: "jordan@fitpro.com", role: "admin", avatar: "JC", joinedAt: "2024-06-15" },
  { id: "3", name: "Sam Lee", email: "sam@fitpro.com", role: "sales", avatar: "SL", joinedAt: "2025-01-10" },
  { id: "4", name: "Taylor Brooks", email: "taylor@fitpro.com", role: "ambassador", avatar: "TB", joinedAt: "2025-03-20" },
  { id: "5", name: "Morgan Davis", email: "morgan@fitpro.com", role: "sales", avatar: "MD", joinedAt: "2025-06-01" },
]

export const coaches: Coach[] = [
  {
    id: "1",
    name: "Alex Thompson",
    title: "Fitness & Transformation Coach",
    tagline: "12-week transformations that stick",
    bio: "Certified personal trainer and nutrition coach. I help busy professionals build sustainable fitness habits and achieve their body goals.",
    avatar: "AT",
    productIds: ["1", "3"],
    rating: 4.8,
    clientsCount: 342,
  },
  {
    id: "2",
    name: "Jordan Cruz",
    title: "Mindfulness & Wellness Coach",
    tagline: "Stress less, live more",
    bio: "Mindfulness and meditation specialist. I guide clients to reduce stress, improve focus, and build a daily practice that fits their lifestyle.",
    avatar: "JC",
    productIds: ["2"],
    rating: 4.9,
    clientsCount: 1205,
  },
  {
    id: "3",
    name: "Sam Lee",
    title: "Executive & Leadership Coach",
    tagline: "Lead with clarity and impact",
    bio: "Executive coach focused on leadership development, decision-making, and high-performance habits for leaders and teams.",
    avatar: "SL",
    productIds: ["3"],
    rating: 5.0,
    clientsCount: 28,
  },
]

export const offers: Offer[] = [
  { id: "1", name: "Fitness Starter Pack", type: "bundle", price: 349, products: ["Complete Fitness Transformation", "Mindfulness Mastery"], status: "active", redemptions: 45 },
  { id: "2", name: "Monthly Coaching", type: "subscription", price: 199, interval: "monthly", products: ["1:1 Executive Coaching"], status: "active", redemptions: 28 },
  { id: "3", name: "Yearly All Access", type: "subscription", price: 1499, interval: "yearly", products: ["Complete Fitness Transformation", "Mindfulness Mastery", "1:1 Executive Coaching"], status: "active", redemptions: 12 },
  { id: "4", name: "Holiday Special", type: "one-time", price: 197, products: ["Complete Fitness Transformation"], status: "inactive", redemptions: 85 },
]

export const revenueData = [
  { month: "Sep", revenue: 4200, sales: 18 },
  { month: "Oct", revenue: 6800, sales: 24 },
  { month: "Nov", revenue: 8100, sales: 31 },
  { month: "Dec", revenue: 12400, sales: 42 },
  { month: "Jan", revenue: 9600, sales: 35 },
  { month: "Feb", revenue: 14200, sales: 48 },
]

export const testimonials = [
  { id: "1", name: "Sarah J.", text: "This program completely changed my life. I lost 30 pounds and gained so much confidence!", rating: 5, avatar: "SJ" },
  { id: "2", name: "Michael C.", text: "The coaching calls were incredibly valuable. Alex really knows how to motivate and guide.", rating: 5, avatar: "MC" },
  { id: "3", name: "Emily D.", text: "Best investment I've made in myself. The content quality is outstanding.", rating: 5, avatar: "ED" },
  { id: "4", name: "Lisa P.", text: "The nutrition guide alone is worth the price. Comprehensive and easy to follow.", rating: 4, avatar: "LP" },
]

export const dashboardStats = {
  totalRevenue: 55300,
  revenueChange: 18.2,
  totalClients: 342,
  clientsChange: 12.5,
  totalSales: 198,
  salesChange: 24.1,
  conversionRate: 3.2,
  conversionChange: 0.8,
}
