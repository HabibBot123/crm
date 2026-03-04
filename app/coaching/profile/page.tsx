"use client"

import { useState } from "react"
import { User, Mail, Camera, LogOut, BookOpen, Trophy, Clock, CreditCard, ChevronRight, Shield, Bell, Moon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"

const profile = {
  name: "Sarah Johnson",
  email: "sarah@example.com",
  avatar: "SJ",
  memberSince: "October 2025",
  coursesCompleted: 4,
  totalHours: 48,
  certificatesEarned: 2,
}

const purchaseHistory = [
  { id: "1", product: "Complete Fitness Transformation", date: "Oct 15, 2025", amount: "$297" },
  { id: "2", product: "Mindfulness Mastery", date: "Nov 8, 2025", amount: "$49" },
  { id: "3", product: "1:1 Executive Coaching", date: "Dec 1, 2025", amount: "$199/mo" },
]

export default function StudentProfilePage() {
  const [editOpen, setEditOpen] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground font-display">Profile</h1>

      {/* Profile Card */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {profile.avatar}
                </AvatarFallback>
              </Avatar>
              <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
                <Camera className="h-3.5 w-3.5" />
                <span className="sr-only">Change avatar</span>
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Member since {profile.memberSince}</p>
            </div>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Edit Profile</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Edit Profile</DialogTitle>
                  <DialogDescription>Update your personal information</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setEditOpen(false) }}>
                  <div>
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input id="edit-name" defaultValue={profile.name} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input id="edit-email" type="email" defaultValue={profile.email} className="mt-1.5" />
                  </div>
                  <Button type="submit" className="w-full">Save Changes</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Row */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted p-3 text-center">
              <BookOpen className="mx-auto h-4 w-4 text-primary" />
              <p className="mt-1.5 text-lg font-bold text-foreground font-display">{profile.coursesCompleted}</p>
              <p className="text-[10px] text-muted-foreground">Completed</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <Clock className="mx-auto h-4 w-4 text-accent" />
              <p className="mt-1.5 text-lg font-bold text-foreground font-display">{profile.totalHours}h</p>
              <p className="text-[10px] text-muted-foreground">Learning</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <Trophy className="mx-auto h-4 w-4 text-warning" />
              <p className="mt-1.5 text-lg font-bold text-foreground font-display">{profile.certificatesEarned}</p>
              <p className="text-[10px] text-muted-foreground">Certificates</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase History */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Purchase History</h3>
            </div>
            <Badge variant="secondary" className="text-[10px]">{purchaseHistory.length} orders</Badge>
          </div>
          <div className="divide-y divide-border">
            {purchaseHistory.map((purchase) => (
              <div key={purchase.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{purchase.product}</p>
                  <p className="text-xs text-muted-foreground">{purchase.date}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{purchase.amount}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Settings</h3>
          </div>

          <div className="divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates about your courses</p>
                </div>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Get notified on your device</p>
                </div>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
            </div>

            <Link href="/" className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your security credentials</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Link href="/login">
        <Button variant="outline" className="w-full gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </Link>
    </div>
  )
}
