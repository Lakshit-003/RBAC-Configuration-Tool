"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Editorial = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: { email: string } | null;
  createdAt?: string;
};

export default function ContentPage() {
  const [items, setItems] = useState<Editorial[]>([]);
  const [editing, setEditing] = useState<Editorial | null>(null);
  const [isEditor, setIsEditor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // dynamic permission flags (fetched from server)
  const [canCreate, setCanCreate] = useState(false);
  const [canEditAny, setCanEditAny] = useState(false);
  const [canEditOwn, setCanEditOwn] = useState(false);
  const [canDeleteAny, setCanDeleteAny] = useState(false);
  const [canDeleteOwn, setCanDeleteOwn] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await apiFetch<{ user: { id: string; roles?: string[] } }>(
          "/api/auth/me"
        );
        if (!mounted) return;
        setMeId(me.user.id);
        const roles = me.user.roles || [];
        setIsEditor(roles.includes("editor"));
        setIsAdmin(roles.includes("admin"));

        // load editorials
        await loadEditorials();

        // load permission flags (so UI reflects DB-driven permissions dynamically)
        await loadPermissionFlags();

        // refresh permission flags on window focus so admin changes apply quickly
        const onFocus = () => {
          loadPermissionFlags().catch(() => {});
        };
        window.addEventListener("focus", onFocus);

        // cleanup
        return () => {
          mounted = false;
          window.removeEventListener("focus", onFocus);
        };
      } catch {
        // not authenticated or error - still try to load public editorials
        await loadEditorials();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function loadEditorials() {
    try {
      const data = await apiFetch<Editorial[]>("/api/editorials");
      setItems(data);
    } catch {
      // show empty list on error
      setItems([]);
    }
  }

  async function createEditorial(title: string, content: string) {
    if (!canCreate)
      return alert("You don't have permission to create journals.");
    setBusyId("new");
    try {
      await apiFetch<Editorial>("/api/editorials", {
        method: "POST",
        body: JSON.stringify({ title, content }),
      });
      await loadEditorials();
      setEditing(null);
    } catch (err) {
      // handle error (permission or validation)
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function updateEditorial(id: string, title: string, content: string) {
    // client-side guard: check permission flags BEFORE sending request
    if (
      !(
        canEditAny ||
        (canEditOwn && meId === null) ||
        (canEditOwn && meId !== null)
      )
    ) {
      // we'll still send request and rely on server for final enforcement, but warn the user
      // (the server enforces the permission strictly)
    }

    setBusyId(id);
    try {
      await apiFetch(`/api/editorials/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      });
      await loadEditorials();
      setEditing(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEditorial(id: string) {
    if (!confirm("Delete this post? This action cannot be undone.")) return;
    setBusyId(id);
    try {
      await apiFetch(`/api/editorials/${id}`, { method: "DELETE" });
      await loadEditorials();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading)
    return <div className="text-sm text-muted-foreground">Loading…</div>;

  async function loadPermissionFlags() {
    try {
      const [createRes, editAnyRes, editOwnRes, delAnyRes, delOwnRes] =
        await Promise.all([
          apiFetch<{ allowed: boolean }>(
            "/api/auth/has?permission=journal:create"
          ).catch(() => ({ allowed: false })),
          apiFetch<{ allowed: boolean }>(
            "/api/auth/has?permission=journal:edit:any"
          ).catch(() => ({ allowed: false })),
          apiFetch<{ allowed: boolean }>(
            "/api/auth/has?permission=journal:edit:own"
          ).catch(() => ({ allowed: false })),
          apiFetch<{ allowed: boolean }>(
            "/api/auth/has?permission=journal:delete:any"
          ).catch(() => ({ allowed: false })),
          apiFetch<{ allowed: boolean }>(
            "/api/auth/has?permission=journal:delete:own"
          ).catch(() => ({ allowed: false })),
        ]);

      setCanCreate(Boolean(createRes?.allowed));
      setCanEditAny(Boolean(editAnyRes?.allowed));
      setCanEditOwn(Boolean(editOwnRes?.allowed));
      setCanDeleteAny(Boolean(delAnyRes?.allowed));
      setCanDeleteOwn(Boolean(delOwnRes?.allowed));
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-sm text-muted-foreground">Journals</p>
        </div>
        {(isEditor || isAdmin) && (
          <Button
            onClick={() =>
              setEditing({ id: "new", title: "", content: "", authorId: "" })
            }
            disabled={busyId === "new"}
          >
            New Journal
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No journals yet.</div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="rounded-md border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{it.title}</h3>
                  <p className="text-sm text-muted-foreground">{it.content}</p>
                  <div className="text-xs text-muted-foreground mt-2">
                    By {it.author?.email ?? "(unknown)"} • {it.createdAt}
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Edit/Delete available when admin OR editor who owns this journal */}
                  {(canEditAny ||
                    (canEditOwn && it.authorId === meId) ||
                    isAdmin) && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(it)}
                        disabled={busyId === it.id}
                      >
                        Edit
                      </Button>
                      {(canDeleteAny ||
                        (canDeleteOwn && it.authorId === meId) ||
                        isAdmin) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteEditorial(it.id)}
                          disabled={busyId === it.id}
                        >
                          {busyId === it.id ? "Deleting..." : "Delete"}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditorDialog
          item={editing}
          onCancel={() => setEditing(null)}
          onSave={(title, content) => {
            if (editing.id === "new") return createEditorial(title, content);
            return updateEditorial(editing.id, title, content);
          }}
          busy={busyId === "new"}
        />
      )}
    </div>
  );
}

function EditorDialog({
  item,
  onCancel,
  onSave,
  busy,
}: {
  item: Editorial;
  onCancel: () => void;
  onSave: (title: string, content: string) => void;
  busy?: boolean;
}) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="space-y-2">
        <input
          className="w-full rounded-md border px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <textarea
          className="w-full rounded-md border px-3 py-2"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Body"
        />
        <div className="flex gap-2">
          <Button onClick={() => onSave(title, content)} disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
