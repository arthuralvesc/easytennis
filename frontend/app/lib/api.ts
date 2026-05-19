const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export class ApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(body.error ?? res.statusText, res.status)
  }
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
}

export interface PlayerDto {
  name: string
  email: string
}

export interface GameDayResponse {
  id: number
  date: string
  numberOfCourts: number
  numberOfHours: number
  totalPrice: number
  players: PlayerDto[]
  createdAt: string
}

export interface GameDayRequest {
  date: string
  numberOfCourts: number
  numberOfHours: number
  totalPrice: number
  players: PlayerDto[]
}

export interface PlayerSplitDto {
  name: string
  email: string
  amountToPay: number
}

export interface CostSplitResponse {
  gameDayId: number
  playerAmounts: PlayerSplitDto[]
}

export const api = {
  auth: {
    login: (data: LoginRequest) =>
      request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    register: (data: { name: string; email: string; password: string }) =>
      request<void>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    forgotPassword: (email: string) =>
      request<void>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    verifyResetCode: (email: string, code: string) =>
      request<void>("/auth/verify-reset-code", { method: "POST", body: JSON.stringify({ email, code }) }),
    resetPassword: (email: string, code: string, newPassword: string) =>
      request<void>("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, code, newPassword }) }),
  },
  gameDays: {
    list: () => request<GameDayResponse[]>("/game-days"),
    getById: (id: number) => request<GameDayResponse>(`/game-days/${id}`),
    create: (data: GameDayRequest) =>
      request<GameDayResponse>("/game-days", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: GameDayRequest) =>
      request<GameDayResponse>(`/game-days/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/game-days/${id}`, { method: "DELETE" }),
  },
  costSplit: {
    calculate: (gameDayId: number, payingPlayerEmails: string[]) =>
      request<CostSplitResponse>("/cost-split", {
        method: "POST",
        body: JSON.stringify({ gameDayId, payingPlayerEmails }),
      }),
  },
}
