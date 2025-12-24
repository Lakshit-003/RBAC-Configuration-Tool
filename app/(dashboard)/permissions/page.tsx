"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"

type Permission = {
  id: string
  name: string
  description: string | null
  createdAt: string
}

export default function PermissionsPage() {
  const router = useRouter()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Permission | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [busy, setBusy] = useState(false)

  const sortedPermissions = useMemo(
    () => [...permissions].sort((a, b) => a.name.localeCompare(b.name)),
    [permissions]
  )

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.replace("/login")
      return
    }
    load()
  }, [router])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Permission[]>("/api/permissions")
      setPermissions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load permissions")
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setName("")
    setDescription("")
    setDialogOpen(true)
  }

  function openEdit(p: Permission) {
    setEditing(p)
    setName(p.name)
    setDescription(p.description || "")
    setDialogOpen(true)
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      if (editing) {
        await apiFetch(`/api/permissions/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({ name, description: description || null }),
        })
      } else {
        await apiFetch(`/api/permissions`, {
          method: "POST",
          body: JSON.stringify({ name, description: description || null }),
        })
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this permission?")) return
    setBusy(true)
    setError(null)
    try {
      await apiFetch(`/api/permissions/${id}`, { method: "DELETE" })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Manage permissions used for RBAC enforcement.
          </p>
        </div>
        <Button onClick={openCreate}>Create Permission</Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading permissions...</div>
      ) : sortedPermissions.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No permissions found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Description</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Created</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {sortedPermissions.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(p.id)}
                        disabled={busy}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">
              {editing ? "Edit Permission" : "Create Permission"}
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium">Name</label>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. edit:post"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium">Description</label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={busy || !name.trim()}>
                  {busy ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

