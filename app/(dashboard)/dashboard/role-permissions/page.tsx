"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Role = { id: string; name: string };
type Permission = { id: string; name: string };

export default function RolePermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
      } catch {
        // ignore for now
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadRolePermissions(roleId: string) {
    const res = await apiFetch<{ permissions: Permission[] }>(
      `/api/roles/${roleId}/permissions`
    );
    const permSet = new Set(res.permissions.map((p) => p.id));
    setRolePerms(permSet);
  }

  async function togglePermission(permissionId: string) {
    if (!selectedRole) return;
    if (rolePerms.has(permissionId)) {
      await apiFetch(`/api/roles/${selectedRole}/permissions/${permissionId}`, {
        method: "DELETE",
      });
    } else {
      await apiFetch(`/api/roles/${selectedRole}/permissions`, {
        method: "POST",
        body: JSON.stringify({ permissionId }),
      });
    }
    await loadRolePermissions(selectedRole);
  }

  if (loading)
    return (
      <div className="text-sm text-muted-foreground">
        Loading roles and permissions...
      </div>
    );

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

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 rounded-md border bg-card p-4">
          <div className="font-medium mb-2">Roles</div>
          {roles.length === 0 ? (
            <div className="text-sm text-muted-foreground">No roles.</div>
          ) : (
            <div className="space-y-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  className={`w-full text-left rounded-md px-3 py-2 ${
                    selectedRole === r.id
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedRole(r.id);
                    loadRolePermissions(r.id);
                  }}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2 rounded-md border bg-card p-4">
          <div className="font-medium mb-2">Permissions</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {permissions.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div>{p.name}</div>
                <div>
                  <button
                    onClick={() => togglePermission(p.id)}
                    className="text-xs underline"
                  >
                    {rolePerms.has(p.id) ? "Remove" : "Assign"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
