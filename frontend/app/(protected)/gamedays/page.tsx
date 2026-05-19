"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, GameDayResponse } from "@/app/lib/api"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus } from "lucide-react"

export default function GameDaysPage() {
  const [gameDays, setGameDays] = useState<GameDayResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    api.gameDays
      .list()
      .then(setGameDays)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load game days"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-muted-foreground">Loading…</p>
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Game Days</h1>
        <Button onClick={() => router.push("/gamedays/new")} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          New Game Day
        </Button>
      </div>

      {gameDays.length === 0 ? (
        <p className="text-muted-foreground">No game days yet. Create your first one!</p>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Courts</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Total Price</TableHead>
                <TableHead>Players</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gameDays.map((gd) => (
                <TableRow
                  key={gd.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/gamedays/${gd.id}/edit`)}
                >
                  <TableCell>{new Date(gd.date + "T00:00:00").toLocaleDateString()}</TableCell>
                  <TableCell>{gd.numberOfCourts}</TableCell>
                  <TableCell>{gd.numberOfHours}h</TableCell>
                  <TableCell>R$ {Number(gd.totalPrice).toFixed(2)}</TableCell>
                  <TableCell>{gd.players.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
