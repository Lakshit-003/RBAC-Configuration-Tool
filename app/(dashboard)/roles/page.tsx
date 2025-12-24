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

type Role = {
  id: string
  name: string
  createdAt: string
  permissions: Permission[]
}

export default function RolesPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
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
      const data = await apiFetch<Role[]>("/api/roles")
      setRoles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles")
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setName("")
    setDialogOpen(true)
  }

  function openEdit(r: Role) {
    setEditing(r)
    setName(r.name)
    setDialogOpen(true)
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      if (editing) {
        await apiFetch(`/api/roles/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        })
      } else {
        await apiFetch(`/api/roles`, {
          method: "POST",
          body: JSON.stringify({ name }),
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
    if (!confirm("Delete this role?")) return
    setBusy(true)
    setError(null)
    try {
      await apiFetch(`/api/roles/${id}`, { method: "DELETE" })
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
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-sm text-muted-foreground">Manage roles and view their permissions.</p>
        </div>
        <Button onClick={openCreate}>Create Role</Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading roles...</div>
      ) : sortedRoles.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No roles found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Permissions</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Created</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {sortedRoles.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.permissions.length === 0
                      ? "—"
                      : r.permissions.map((p) => p.name).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(r.id)}
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
              {editing ? "Edit Role" : "Create Role"}
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium">Name</label>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. editor"
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

