"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/context/AuthContext"
import Header from "@/app/components/Header"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (token === null && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, token, router])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">{children}</main>
    </div>
  )
}
