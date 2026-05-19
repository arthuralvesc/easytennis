"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, GameDayRequest, GameDayResponse } from "@/app/lib/api"
import GameDayForm, { GameDayFormValues } from "@/app/components/GameDayForm"

export default function EditGameDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const numericId = Number(id)
  const router = useRouter()
  const [gameDay, setGameDay] = useState<GameDayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    api.gameDays
      .getById(numericId)
      .then(setGameDay)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load game day"))
      .finally(() => setLoading(false))
  }, [numericId])

  async function handleUpdate(data: GameDayRequest) {
    await api.gameDays.update(numericId, data)
    router.push("/gamedays")
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await api.gameDays.delete(numericId)
      router.push("/gamedays")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete")
      setIsDeleting(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>
  if (error) return <p className="text-destructive">{error}</p>
  if (!gameDay) return null

  const defaultValues: Partial<GameDayFormValues> = {
    date: gameDay.date,
    numberOfCourts: gameDay.numberOfCourts,
    numberOfHours: gameDay.numberOfHours,
    totalPrice: gameDay.totalPrice,
    players: gameDay.players,
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Edit Game Day</h1>
      <GameDayForm
        defaultValues={defaultValues}
        submitLabel="Save Changes"
        onSubmit={handleUpdate}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}
