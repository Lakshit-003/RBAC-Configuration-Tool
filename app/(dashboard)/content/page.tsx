"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Item = { id: string; title: string; body: string };

export default function ContentPage() {
  const [items, setItems] = useState<Item[]>([
    { id: "1", title: "Welcome Post", body: "This is editable content." },
    { id: "2", title: "About", body: "Placeholder content for the dashboard." },
  ]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await apiFetch("/api/protected-example", { method: "POST" });
        setCanEdit(true);
      } catch {
        setCanEdit(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function save(item: Item) {
    setItems((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (exists) return prev.map((p) => (p.id === item.id ? item : p));
      return [...prev, item];
    });
    setEditing(null);
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading)
    return (
      <div className="text-sm text-muted-foreground">Checking permissions…</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-sm text-muted-foreground">
            Create and edit placeholder content.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() =>
              setEditing({ id: Date.now().toString(), title: "", body: "" })
            }
          >
            New Post
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No content yet.</div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="rounded-md border bg-card p-4">
              <h3 className="font-semibold">{it.title}</h3>
              <p className="text-sm text-muted-foreground">{it.body}</p>
              <div className="mt-3 flex gap-2">
                {canEdit && (
                  <>
                    <Button variant="outline" onClick={() => setEditing(it)}>
                      Edit
                    </Button>
                    <Button variant="destructive" onClick={() => remove(it.id)}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditorDialog
          item={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function EditorDialog({
  item,
  onCancel,
  onSave,
}: {
  item: Item;
  onCancel: () => void;
  onSave: (i: Item) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);

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
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Body"
        />
        <div className="flex gap-2">
          <Button onClick={() => onSave({ ...item, title, body })}>Save</Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
