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

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
})

const verifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
})

const resetSchema = z
  .object({
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>
type ForgotValues = z.infer<typeof forgotSchema>
type VerifyValues = z.infer<typeof verifySchema>
type ResetValues = z.infer<typeof resetSchema>
type Mode = "login" | "register" | "forgot" | "verify" | "reset"

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resetEmail, setResetEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const { login } = useAuth()
  const router = useRouter()

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })
  const forgotForm = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) })
  const verifyForm = useForm<VerifyValues>({ resolver: zodResolver(verifySchema) })
  const resetForm = useForm<ResetValues>({ resolver: zodResolver(resetSchema) })

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setSuccess(null)
  }

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

  async function onForgot(values: ForgotValues) {
    setError(null)
    try {
      await api.auth.forgotPassword(values.email)
      setResetEmail(values.email)
      switchMode("verify")
      setSuccess("A 6-digit code was sent to your email.")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send reset code")
    }
  }

  async function onVerify(values: VerifyValues) {
    setError(null)
    try {
      await api.auth.verifyResetCode(resetEmail, values.code)
      setResetCode(values.code)
      switchMode("reset")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid or expired code")
    }
  }

  async function onReset(values: ResetValues) {
    setError(null)
    try {
      await api.auth.resetPassword(resetEmail, resetCode, values.newPassword)
      switchMode("login")
      setSuccess("Password updated! You can now log in.")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reset password")
    }
  }

  const isForgotFlow = mode === "forgot" || mode === "verify" || mode === "reset"

  const stepTitle: Record<Mode, string> = {
    login: "EasyTennis",
    register: "EasyTennis",
    forgot: "Forgot Password",
    verify: "Enter Reset Code",
    reset: "New Password",
  }

  const stepDescription: Record<string, string> = {
    forgot: "Enter your email to receive a 6-digit reset code.",
    verify: `Enter the code sent to ${resetEmail}.`,
    reset: "Choose a new password for your account.",
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{stepTitle[mode]}</CardTitle>
          {isForgotFlow && (
            <p className="text-sm text-muted-foreground text-center mt-1">{stepDescription[mode]}</p>
          )}
        </CardHeader>
        <CardContent>
          {!isForgotFlow && (
            <div className="flex mb-6 border-b border-border">
              <button
                className={`flex-1 pb-2 text-sm font-medium ${mode === "login" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                onClick={() => switchMode("login")}
              >
                Login
              </button>
              <button
                className={`flex-1 pb-2 text-sm font-medium ${mode === "register" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                onClick={() => switchMode("register")}
              >
                Register
              </button>
            </div>
          )}

          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          {success && <p className="mb-4 text-sm text-green-600">{success}</p>}

          {mode === "login" && (
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
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline mt-1"
                  onClick={() => switchMode("forgot")}
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                {loginForm.formState.isSubmitting ? <><Spinner className="mr-1" />Logging in…</> : "Login"}
              </Button>
            </form>
          )}

          {mode === "register" && (
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

          {mode === "forgot" && (
            <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="forgot-email">Email</Label>
                <Input id="forgot-email" type="email" {...forgotForm.register("email")} />
                {forgotForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{forgotForm.formState.errors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={forgotForm.formState.isSubmitting}>
                {forgotForm.formState.isSubmitting ? <><Spinner className="mr-1" />Sending…</> : "Send Code"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                onClick={() => switchMode("login")}
              >
                Back to login
              </button>
            </form>
          )}

          {mode === "verify" && (
            <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="verify-code">6-digit code</Label>
                <Input id="verify-code" inputMode="numeric" maxLength={6} {...verifyForm.register("code")} />
                {verifyForm.formState.errors.code && (
                  <p className="text-xs text-destructive">{verifyForm.formState.errors.code.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={verifyForm.formState.isSubmitting}>
                {verifyForm.formState.isSubmitting ? <><Spinner className="mr-1" />Verifying…</> : "Verify Code"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                onClick={() => switchMode("login")}
              >
                Back to login
              </button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="reset-password">New Password</Label>
                <Input id="reset-password" type="password" {...resetForm.register("newPassword")} />
                {resetForm.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">{resetForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="reset-confirm">Confirm Password</Label>
                <Input id="reset-confirm" type="password" {...resetForm.register("confirmPassword")} />
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{resetForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={resetForm.formState.isSubmitting}>
                {resetForm.formState.isSubmitting ? <><Spinner className="mr-1" />Saving…</> : "Set New Password"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                onClick={() => switchMode("login")}
              >
                Back to login
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
