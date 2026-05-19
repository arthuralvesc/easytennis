"use client"

import { useEffect, useState } from "react"
import { api, GameDayResponse, CostSplitResponse } from "@/app/lib/api"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function CostSplitPage() {
  const [gameDays, setGameDays] = useState<GameDayResponse[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<CostSplitResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.gameDays
      .list()
      .then(setGameDays)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load game days"))
      .finally(() => setLoading(false))
  }, [])

  const selectedGameDay = gameDays.find((gd) => gd.id === selectedId) ?? null

  function handleSelectGameDay(value: string) {
    const id = Number(value)
    setSelectedId(id)
    const gd = gameDays.find((g) => g.id === id)
    setCheckedEmails(new Set(gd?.players.map((p) => p.email) ?? []))
    setResult(null)
  }

  function togglePlayer(email: string) {
    setCheckedEmails((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
    setResult(null)
  }

  async function handleCalculate() {
    if (!selectedId || checkedEmails.size === 0) return
    setCalculating(true)
    setError(null)
    try {
      const res = await api.costSplit.calculate(selectedId, Array.from(checkedEmails))
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to calculate")
    } finally {
      setCalculating(false)
    }
  }

  const amountMap = new Map(result?.playerAmounts.map((p) => [p.email, p.amountToPay]) ?? [])

  if (loading) return <p className="text-muted-foreground">Loading…</p>
  if (error && !selectedId) return <p className="text-destructive">{error}</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cost Split</h1>

      <div className="space-y-2">
        <Label>Select Game Day</Label>
        <Select onValueChange={handleSelectGameDay}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a game day…" />
          </SelectTrigger>
          <SelectContent>
            {gameDays.map((gd) => (
              <SelectItem key={gd.id} value={String(gd.id)}>
                {new Date(gd.date + "T00:00:00").toLocaleDateString()} — R${" "}
                {Number(gd.totalPrice).toFixed(2)} — {gd.players.length} players
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGameDay && (
        <div className="space-y-3">
          <Label>Players paying</Label>
          {selectedGameDay.players.map((player) => {
            const amount = amountMap.get(player.email)
            return (
              <div key={player.email} className="flex items-center gap-3">
                <Checkbox
                  id={player.email}
                  checked={checkedEmails.has(player.email)}
                  onCheckedChange={() => togglePlayer(player.email)}
                />
                <label
                  htmlFor={player.email}
                  className="flex-1 text-sm cursor-pointer select-none"
                >
                  {player.name}{" "}
                  <span className="text-muted-foreground text-xs">({player.email})</span>
                </label>
                {amount !== undefined && (
                  <span className="text-sm font-medium text-primary">
                    R$ {amount.toFixed(2)}
                  </span>
                )}
              </div>
            )
          })}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            onClick={handleCalculate}
            disabled={calculating || checkedEmails.size === 0}
            className="mt-2"
          >
            {calculating ? "Calculating…" : "Calculate Split"}
          </Button>
        </div>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Split Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.playerAmounts.map((p) => (
              <div key={p.email} className="flex justify-between text-sm">
                <span>{p.name}</span>
                <span className="font-semibold">R$ {p.amountToPay.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
