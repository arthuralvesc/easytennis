"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, GameDayRequest, PlayerProfileResponse } from "@/app/lib/api"
import GameDayForm from "@/app/components/GameDayForm"
import { PageSpinner } from "@/app/components/Spinner"

export default function NewGameDayPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<PlayerProfileResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.players
      .list()
      .then(setPlayers)
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(data: GameDayRequest) {
    await api.gameDays.create(data)
    router.push("/gamedays")
  }

  if (loading) return <PageSpinner />

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">New Game Day</h1>
      <GameDayForm
        availablePlayers={players}
        submitLabel="Create Game Day"
        onSubmit={handleCreate}
      />
    </div>
  )
}
