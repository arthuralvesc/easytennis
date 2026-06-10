"use client"

import { useState } from "react"
import { Controller, Resolver, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api, GameDayRequest, PlayerProfileResponse } from "@/app/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserPlus } from "lucide-react"
import { Spinner } from "@/app/components/Spinner"

const gameDaySchema = z.object({
  date: z.string().min(1, "Date is required"),
  numberOfCourts: z.coerce.number().int().positive("Must be a positive number"),
  numberOfHours: z.coerce.number().int().positive("Must be a positive number"),
  totalPrice: z.coerce.number().positive("Must be a positive number"),
})

export type GameDayFormValues = z.infer<typeof gameDaySchema>

interface GameDayFormProps {
  defaultValues?: Partial<GameDayFormValues>
  availablePlayers: PlayerProfileResponse[]
  initialSelectedProfileIds?: number[]
  orphanPlayers?: Array<{ name: string; profileId: number | null }>
  onSubmit: (data: GameDayRequest) => Promise<void>
  submitLabel: string
  isDeleting?: boolean
  onDelete?: () => Promise<void>
}

export default function GameDayForm({
  defaultValues,
  availablePlayers: initialAvailablePlayers,
  initialSelectedProfileIds = [],
  orphanPlayers = [],
  onSubmit,
  submitLabel,
  isDeleting,
  onDelete,
}: GameDayFormProps) {
  const form = useForm<GameDayFormValues>({
    resolver: zodResolver(gameDaySchema) as unknown as Resolver<GameDayFormValues>,
    defaultValues: {
      date: "",
      numberOfCourts: 1,
      numberOfHours: 1,
      totalPrice: 0,
      ...defaultValues,
    },
  })

  const [availablePlayers, setAvailablePlayers] = useState<PlayerProfileResponse[]>(initialAvailablePlayers)
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<number>>(
    new Set(initialSelectedProfileIds)
  )
  const [playersError, setPlayersError] = useState<string | null>(null)

  // Add New Player dialog
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState("")
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  function toggleProfile(profileId: number) {
    setSelectedProfileIds((prev) => {
      const next = new Set(prev)
      if (next.has(profileId)) next.delete(profileId)
      else next.add(profileId)
      return next
    })
  }

  async function handleAddPlayer() {
    setAddSaving(true)
    setAddError(null)
    try {
      const created = await api.players.create({ name: addName })
      setAvailablePlayers((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      )
      setSelectedProfileIds((prev) => new Set([...prev, created.id]))
      setShowAdd(false)
      setAddName("")
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to create player")
    } finally {
      setAddSaving(false)
    }
  }

  async function handleSubmit(values: GameDayFormValues) {
    const managedSelected = availablePlayers.filter((p) => selectedProfileIds.has(p.id))
    const allPlayers = [
      ...managedSelected.map((p) => ({ name: p.name, profileId: p.id })),
      ...orphanPlayers,
    ]
    if (allPlayers.length === 0) {
      setPlayersError("Select at least one player")
      return
    }
    setPlayersError(null)
    await onSubmit({
      date: values.date,
      numberOfCourts: values.numberOfCourts,
      numberOfHours: values.numberOfHours,
      totalPrice: values.totalPrice,
      players: allPlayers,
    })
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...form.register("date")} />
          {form.formState.errors.date && (
            <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="courts">Number of Courts</Label>
          <Input id="courts" type="number" min={1} {...form.register("numberOfCourts")} />
          {form.formState.errors.numberOfCourts && (
            <p className="text-xs text-destructive">{form.formState.errors.numberOfCourts.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="hours">Hours Played</Label>
          <Input id="hours" type="number" min={1} {...form.register("numberOfHours")} />
          {form.formState.errors.numberOfHours && (
            <p className="text-xs text-destructive">{form.formState.errors.numberOfHours.message}</p>
          )}
        </div>

        <div className="col-span-2 space-y-1">
          <Label htmlFor="price">Total Price (R$)</Label>
          <Controller
            name="totalPrice"
            control={form.control}
            render={({ field }) => {
              const cents = Math.round(field.value * 100)
              const display = `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`
              return (
                <Input
                  id="price"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={display}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "")
                    const newCents = parseInt(digits || "0", 10)
                    field.onChange(newCents / 100)
                  }}
                />
              )
            }}
          />
          {form.formState.errors.totalPrice && (
            <p className="text-xs text-destructive">{form.formState.errors.totalPrice.message}</p>
          )}
        </div>
      </div>

      {/* Players pick-list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Players</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setAddError(null); setAddName(""); setShowAdd(true) }}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            New Player
          </Button>
        </div>

        {playersError && (
          <p className="text-xs text-destructive mb-2">{playersError}</p>
        )}

        <div className="max-h-60 overflow-y-auto rounded-md border border-border divide-y divide-border">
          {availablePlayers.length === 0 && orphanPlayers.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No players in your list yet. Add one with &quot;New Player&quot;.
            </p>
          ) : (
            <>
              {availablePlayers.map((player) => (
                <label
                  key={player.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedProfileIds.has(player.id)}
                    onCheckedChange={() => toggleProfile(player.id)}
                  />
                  <div>
                    <p className="text-sm font-medium">{player.name}</p>
                  </div>
                </label>
              ))}
              {orphanPlayers.map((player, index) => (
                <label
                  key={`orphan-${index}`}
                  className="flex items-center gap-3 px-4 py-3 opacity-60"
                >
                  <Checkbox checked disabled />
                  <div>
                    <p className="text-sm font-medium">
                      {player.name}{" "}
                      <span className="text-xs text-muted-foreground italic">— not in list</span>
                    </p>
                  </div>
                </label>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isDeleting || form.formState.isSubmitting}
          >
            {isDeleting ? <><Spinner className="mr-1" />Deleting…</> : "Delete"}
          </Button>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting || isDeleting}>
          {form.formState.isSubmitting ? <><Spinner className="mr-1" />Saving…</> : submitLabel}
        </Button>
      </div>

      {/* Add New Player Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Player</DialogTitle>
            <DialogDescription>
              Add a player to your list and select them for this game day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Player name"
              />
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={addSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleAddPlayer}
              disabled={addSaving || !addName.trim()}
            >
              {addSaving && <Spinner className="mr-2" />}
              Add &amp; Select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
