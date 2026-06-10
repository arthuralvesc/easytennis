"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CalendarDays, Calculator, LogOut, Users } from "lucide-react"

export default function HomePage() {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const { logout } = useAuth()
  const router = useRouter()

  function handleLogoutConfirm() {
    logout()
    setShowLogoutDialog(false)
    router.push("/login")
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <Card
          className="aspect-square flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push("/gamedays")}
        >
          <CalendarDays className="h-10 w-10 text-muted-foreground" />
          <span className="text-base font-medium">Game Days</span>
        </Card>

        <Card
          className="aspect-square flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push("/cost-split")}
        >
          <Calculator className="h-10 w-10 text-muted-foreground" />
          <span className="text-base font-medium">Cost Split</span>
        </Card>

        <Card
          className="aspect-square flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push("/players")}
        >
          <Users className="h-10 w-10 text-muted-foreground" />
          <span className="text-base font-medium">Manage Players</span>
        </Card>

        <Card
          className="aspect-square flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setShowLogoutDialog(true)}
        >
          <LogOut className="h-10 w-10 text-muted-foreground" />
          <span className="text-base font-medium">Logout</span>
        </Card>
      </div>

      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>Are you sure you want to logout?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogoutConfirm}>Logout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
