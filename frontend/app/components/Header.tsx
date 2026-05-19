"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Header() {
  const { username, logout } = useAuth()
  const router = useRouter()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  function handleLogoutConfirm() {
    logout()
    setShowLogoutDialog(false)
    router.push("/login")
  }

  return (
    <>
      <header className="border-b border-border bg-background px-4 py-3 flex items-center justify-between">
        <span className="font-medium text-foreground">Hello, {username}</span>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/gamedays">Game Days</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cost-split">Cost Split</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowLogoutDialog(true)}>
            Logout
          </Button>
        </nav>
      </header>

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
