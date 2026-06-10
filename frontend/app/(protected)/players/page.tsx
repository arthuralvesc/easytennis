"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { api, PlayerProfileResponse } from "@/app/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronLeft, Pencil, Trash2, UserPlus } from "lucide-react"
import { PageSpinner, Spinner } from "@/app/components/Spinner"

export default function PlayersPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<PlayerProfileResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // New player dialog
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSaving, setNewSaving] = useState(false)
  const [newError, setNewError] = useState<string | null>(null)

  // Edit dialog
  const [editPlayer, setEditPlayer] = useState<PlayerProfileResponse | null>(null)
  const [editName, setEditName] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete dialog
  const [deletePlayer, setDeletePlayer] = useState<PlayerProfileResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.players
      .list()
      .then(setPlayers)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load players")
      )
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () =>
      players.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      ),
    [players, search]
  )

  async function handleCreate() {
    setNewSaving(true)
    setNewError(null)
    try {
      const created = await api.players.create({ name: newName })
      setPlayers((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      )
      setShowNew(false)
      setNewName("")
    } catch (e: unknown) {
      setNewError(e instanceof Error ? e.message : "Failed to create player")
    } finally {
      setNewSaving(false)
    }
  }

  function openEdit(player: PlayerProfileResponse) {
    setEditPlayer(player)
    setEditName(player.name)
    setEditError(null)
  }

  async function handleEdit() {
    if (!editPlayer) return
    setEditSaving(true)
    setEditError(null)
    try {
      const updated = await api.players.update(editPlayer.id, {
        name: editName,
      })
      setPlayers((prev) =>
        prev
          .map((p) => (p.id === updated.id ? updated : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditPlayer(null)
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Failed to update player")
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletePlayer) return
    setDeleting(true)
    try {
      await api.players.delete(deletePlayer.id)
      setPlayers((prev) => prev.filter((p) => p.id !== deletePlayer.id))
      setDeletePlayer(null)
    } catch (e: unknown) {
      console.error(e)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <PageSpinner />
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/home")}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold">Players</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Button size="sm" onClick={() => { setNewError(null); setNewName(""); setShowNew(true) }}>
          <UserPlus className="mr-1 h-4 w-4" />
          New Player
        </Button>
      </div>

      {/* Player list */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground">
          {players.length === 0
            ? "No players yet. Add your first one!"
            : "No players match your search."}
        </p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {filtered.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="font-medium">{player.name}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(player)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletePlayer(player)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Player Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Player</DialogTitle>
            <DialogDescription>
              Add a player to your frequently played list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Player name"
              />
            </div>
            {newError && <p className="text-sm text-destructive">{newError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)} disabled={newSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={newSaving || !newName.trim()}
            >
              {newSaving && <Spinner className="mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={!!editPlayer} onOpenChange={(open) => { if (!open) setEditPlayer(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>Update the player&apos;s details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Player name"
              />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlayer(null)} disabled={editSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editSaving || !editName.trim()}
            >
              {editSaving && <Spinner className="mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletePlayer} onOpenChange={(open) => { if (!open) setDeletePlayer(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Player</DialogTitle>
            <DialogDescription>
              Remove <strong>{deletePlayer?.name}</strong> from your player list? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePlayer(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Spinner className="mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
