"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/app/context/AuthContext"
import { api, ApiError } from "@/app/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/app/components/Spinner"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { login } = useAuth()
  const router = useRouter()

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  async function onLogin(values: LoginValues) {
    setError(null)
    try {
      const res = await api.auth.login(values)
      login(res.token)
      router.push("/gamedays")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed")
    }
  }

  async function onRegister(values: RegisterValues) {
    setError(null)
    setSuccess(null)
    try {
      await api.auth.register(values)
      setSuccess("Account created! You can now log in.")
      setMode("login")
      registerForm.reset()
    } catch (e: unknown) {
      if (e instanceof ApiError && e.statusCode === 409) {
        setError("This email is already registered.")
      } else {
        setError(e instanceof Error ? e.message : "Registration failed")
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">EasyTennis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex mb-6 border-b border-border">
            <button
              className={`flex-1 pb-2 text-sm font-medium ${mode === "login" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
              onClick={() => { setMode("login"); setError(null); setSuccess(null) }}
            >
              Login
            </button>
            <button
              className={`flex-1 pb-2 text-sm font-medium ${mode === "register" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
              onClick={() => { setMode("register"); setError(null); setSuccess(null) }}
            >
              Register
            </button>
          </div>

          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          {success && <p className="mb-4 text-sm text-green-600">{success}</p>}

          {mode === "login" ? (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" {...loginForm.register("email")} />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" {...loginForm.register("password")} />
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                {loginForm.formState.isSubmitting ? <><Spinner className="mr-1" />Logging in…</> : "Login"}
              </Button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="reg-name">Name</Label>
                <Input id="reg-name" {...registerForm.register("name")} />
                {registerForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg-email">Email</Label>
                <Input id="reg-email" type="email" {...registerForm.register("email")} />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg-password">Password</Label>
                <Input id="reg-password" type="password" {...registerForm.register("password")} />
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                {registerForm.formState.isSubmitting ? <><Spinner className="mr-1" />Creating account…</> : "Register"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
