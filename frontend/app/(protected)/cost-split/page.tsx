"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { PageSpinner, Spinner } from "@/app/components/Spinner"
import { ChevronLeft } from "lucide-react"

export default function CostSplitPage() {
  const router = useRouter()
  const [gameDays, setGameDays] = useState<GameDayResponse[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [checkedIndexes, setCheckedIndexes] = useState<Set<number>>(new Set())
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
    setCheckedIndexes(new Set(gd?.players.map((_, index) => index) ?? []))
    setResult(null)
  }

  function togglePlayer(index: number) {
    setCheckedIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
    setResult(null)
  }

  async function handleCalculate() {
    if (!selectedId || checkedIndexes.size === 0) return
    setCalculating(true)
    setError(null)
    try {
      const res = await api.costSplit.calculate(selectedId, Array.from(checkedIndexes))
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to calculate")
    } finally {
      setCalculating(false)
    }
  }

  const amountMap = new Map(result?.playerAmounts.map((p) => [p.playerIndex, p.amountToPay]) ?? [])

  if (loading) return <PageSpinner />
  if (error && !selectedId) return <p className="text-destructive">{error}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/home")}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold">Cost Split</h1>
      </div>

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
          {selectedGameDay.players.map((player, index) => {
            const amount = amountMap.get(index)
            const checkboxId = `player-${index}`
            return (
              <div key={index} className="flex items-center gap-3">
                <Checkbox
                  id={checkboxId}
                  checked={checkedIndexes.has(index)}
                  onCheckedChange={() => togglePlayer(index)}
                />
                <label
                  htmlFor={checkboxId}
                  className="flex-1 text-sm cursor-pointer select-none"
                >
                  {player.name}
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
            disabled={calculating || checkedIndexes.size === 0}
            className="mt-2"
          >
            {calculating ? <><Spinner className="mr-1" />Calculating…</> : "Calculate Split"}
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
              <div key={p.playerIndex} className="flex justify-between text-sm">
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
