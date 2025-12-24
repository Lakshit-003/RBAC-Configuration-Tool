"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Permission = { id: string; name: string; description: string | null };
type Role = { id: string; name: string };

export default function RolePermissionsPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [initialRolePerms, setInitialRolePerms] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );

  const sortedPermissions = useMemo(
    () => [...permissions].sort((a, b) => a.name.localeCompare(b.name)),
    [permissions]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadInitial() {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([
        apiFetch<Role[]>("/api/roles"),
        apiFetch<Permission[]>("/api/permissions"),
      ]);
      setRoles(rolesData.map((r) => ({ id: r.id, name: r.name })));
      setPermissions(permsData);
      if (rolesData.length > 0) {
        setSelectedRole(rolesData[0].id);
        await loadRolePermissions(rolesData[0].id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      // If server returned 403 (access denied), redirect to dashboard
      if (msg && /403|Forbidden/i.test(msg)) {
        router.replace("/dashboard");
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadRolePermissions(roleId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ permissions: Permission[] }>(
        `/api/roles/${roleId}/permissions`
      );
      const permSet = new Set(res.permissions.map((p) => p.id));
      setRolePerms(permSet);
      setInitialRolePerms(new Set(permSet));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load role permissions"
      );
    } finally {
      setBusy(false);
    }
  }

  function togglePermission(id: string) {
    const next = new Set(rolePerms);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRolePerms(next);
  }

  const hasChanges = useMemo(() => {
    if (rolePerms.size !== initialRolePerms.size) return true;
    for (const id of rolePerms) if (!initialRolePerms.has(id)) return true;
    return false;
  }, [rolePerms, initialRolePerms]);

  async function saveChanges() {
    if (!selectedRole) return;
    setBusy(true);
    setError(null);
    try {
      const toAdd: string[] = [];
      const toRemove: string[] = [];
      for (const id of rolePerms) if (!initialRolePerms.has(id)) toAdd.push(id);
      for (const id of initialRolePerms)
        if (!rolePerms.has(id)) toRemove.push(id);

      await Promise.all([
        ...toAdd.map((permissionId) =>
          apiFetch(`/api/roles/${selectedRole}/permissions`, {
            method: "POST",
            body: JSON.stringify({ permissionId }),
          })
        ),
        ...toRemove.map((permissionId) =>
          apiFetch(`/api/roles/${selectedRole}/permissions/${permissionId}`, {
            method: "DELETE",
          })
        ),
      ]);

      setInitialRolePerms(new Set(rolePerms));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role-Permission Mapping</h1>
          <p className="text-sm text-muted-foreground">
            Assign permissions to roles with instant feedback.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">
          Loading roles and permissions...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[280px,1fr]">
          <div className="rounded-md border bg-card">
            <div className="border-b px-4 py-3 text-sm font-semibold">
              Roles
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {sortedRoles.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No roles.
                </div>
              ) : (
                <ul>
                  {sortedRoles.map((r) => (
                    <li key={r.id}>
                      <button
                        className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${
                          selectedRole === r.id
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => {
                          setSelectedRole(r.id);
                          loadRolePermissions(r.id);
                        }}
                      >
                        <span>{r.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-md border bg-card p-4">
            {selectedRole ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Permissions</h3>
                  <Button onClick={saveChanges} disabled={busy || !hasChanges}>
                    {busy ? "Saving..." : "Save changes"}
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {sortedPermissions.map((p) => {
                    const checked = rolePerms.has(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                          checked
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => togglePermission(p.id)}
                        />
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.description || "No description"}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Select a role to manage permissions.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
