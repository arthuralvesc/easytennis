"use client"

import { useRouter } from "next/navigation"
import { api, GameDayRequest } from "@/app/lib/api"
import GameDayForm from "@/app/components/GameDayForm"

export default function NewGameDayPage() {
  const router = useRouter()

  async function handleCreate(data: GameDayRequest) {
    await api.gameDays.create(data)
    router.push("/gamedays")
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">New Game Day</h1>
      <GameDayForm submitLabel="Create Game Day" onSubmit={handleCreate} />
    </div>
  )
}
