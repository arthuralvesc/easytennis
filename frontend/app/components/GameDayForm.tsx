"use client"

import { Resolver, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { GameDayRequest } from "@/app/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, UserPlus } from "lucide-react"

const playerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
})

const gameDaySchema = z.object({
  date: z.string().min(1, "Date is required"),
  numberOfCourts: z.coerce.number().int().positive("Must be a positive number"),
  numberOfHours: z.coerce.number().int().positive("Must be a positive number"),
  totalPrice: z.coerce.number().positive("Must be a positive number"),
  players: z.array(playerSchema).min(1, "Add at least one player"),
})

export type GameDayFormValues = z.infer<typeof gameDaySchema>

interface GameDayFormProps {
  defaultValues?: Partial<GameDayFormValues>
  onSubmit: (data: GameDayRequest) => Promise<void>
  submitLabel: string
  isDeleting?: boolean
  onDelete?: () => Promise<void>
}

export default function GameDayForm({
  defaultValues,
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
      players: [{ name: "", email: "" }],
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "players",
  })

  async function handleSubmit(values: GameDayFormValues) {
    await onSubmit({
      date: values.date,
      numberOfCourts: values.numberOfCourts,
      numberOfHours: values.numberOfHours,
      totalPrice: values.totalPrice,
      players: values.players,
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
          <Input id="price" type="number" min={0} step="0.01" {...form.register("totalPrice")} />
          {form.formState.errors.totalPrice && (
            <p className="text-xs text-destructive">{form.formState.errors.totalPrice.message}</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Players</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: "", email: "" })}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add Player
          </Button>
        </div>

        {form.formState.errors.players?.root && (
          <p className="text-xs text-destructive mb-2">{form.formState.errors.players.root.message}</p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Name"
                  {...form.register(`players.${index}.name`)}
                />
                {form.formState.errors.players?.[index]?.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.players[index].name?.message}
                  </p>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Email"
                  type="email"
                  {...form.register(`players.${index}.email`)}
                />
                {form.formState.errors.players?.[index]?.email && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.players[index].email?.message}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 shrink-0"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
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
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting || isDeleting}>
          {form.formState.isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  )
}
