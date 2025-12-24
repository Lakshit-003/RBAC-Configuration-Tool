"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Permission = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Permission[]>("/api/permissions");
      setPermissions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load permissions"
      );
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      if (editing) {
        await apiFetch(`/api/permissions/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({ name, description }),
        });
      } else {
        await apiFetch(`/api/permissions`, {
          method: "POST",
          body: JSON.stringify({ name, description }),
        });
      }
      await load();
      setEditing(null);
      setName("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this permission?")) return;
    try {
      await apiFetch(`/api/permissions/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const sortedPermissions = useMemo(
    () => [...permissions].sort((a, b) => a.name.localeCompare(b.name)),
    [permissions]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Manage permissions used for RBAC enforcement.
          </p>
        </div>
        <Button
          onClick={() =>
            setEditing({
              id: "new",
              name: "",
              description: "",
              createdAt: new Date().toISOString(),
            })
          }
        >
          Create Permission
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">
          Loading permissions...
        </div>
      ) : sortedPermissions.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">
          No permissions found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {sortedPermissions.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(p)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(p.id)}
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">
              {editing.id === "new" ? "Create Permission" : "Edit Permission"}
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium">Name</label>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium">Description</label>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
