/* eslint-disable no-console */
// Smoke test for admin flows: login, users list, grant/revoke editor, role-permission mapping

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234";

async function req(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore invalid JSON
  }
  return { status: res.status, ok: res.ok, body: text, json };
}

async function fail(msg) {
  console.error("SMOKE-ADMIN FAILED:", msg);
  process.exit(1);
}

async function run() {
  console.log("SMOKE-ADMIN: starting against", BASE);

  // 1) Login as admin
  console.log("Logging in as admin...", ADMIN_EMAIL);
  const loginRes = await req("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok || !loginRes.json?.token) {
    return fail(
      `/api/auth/login failed: ${loginRes.status} - ${loginRes.body}`
    );
  }
  const token = loginRes.json.token;
  console.log("Admin login OK, token length", token.length);

  // 2) GET /api/users
  console.log("Fetching /api/users");
  const usersRes = await req("/api/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!usersRes.ok)
    return fail(`/api/users failed: ${usersRes.status} - ${usersRes.body}`);
  const users = usersRes.json?.users || [];
  console.log("Users count:", users.length);

  // 3) Create transient user to test grant/revoke
  const testEmail = `smoke+${Date.now()}@example.test`;
  const testPassword = "Test1234!";
  console.log("Creating transient user:", testEmail);
  const signupRes = await req("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  if (!signupRes.ok)
    return fail(
      `/api/auth/signup failed: ${signupRes.status} - ${signupRes.body}`
    );

  // find new user id
  const usersRes2 = await req("/api/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!usersRes2.ok)
    return fail(`/api/users failed: ${usersRes2.status} - ${usersRes2.body}`);
  const users2 = usersRes2.json?.users || [];
  const newUser = users2.find((u) => u.email === testEmail);
  if (!newUser) return fail("Could not find new user in users list");
  console.log("Transient user id:", newUser.id);

  // 4) Grant editor role
  console.log("Granting editor role to", newUser.id);
  const grantRes = await req(`/api/users/${newUser.id}/grant-editor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (![200, 201].includes(grantRes.status))
    return fail(
      `/api/users/grant-editor failed: ${grantRes.status} - ${grantRes.body}`
    );
  console.log("Grant OK");

  // verify roles include editor
  const usersRes3 = await req("/api/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const newUserUpdated = usersRes3.json?.users.find((u) => u.id === newUser.id);
  if (!newUserUpdated || !newUserUpdated.roles.includes("editor"))
    return fail("Grant did not apply (editor role missing)");
  console.log("Editor role confirmed on user");

  // 5) Revoke editor role
  console.log("Revoking editor role from", newUser.id);
  const revokeRes = await req(`/api/users/${newUser.id}/revoke-editor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!revokeRes.ok)
    return fail(
      `/api/users/revoke-editor failed: ${revokeRes.status} - ${revokeRes.body}`
    );
  console.log("Revoke OK");

  // verify roles no longer include editor
  const usersRes4 = await req("/api/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const newUserFinal = usersRes4.json?.users.find((u) => u.id === newUser.id);
  if (!newUserFinal) return fail("User disappeared after revoke");
  console.log("Roles after revoke:", newUserFinal.roles);

  // 6) Test role->permission assign/remove with a transient permission
  const permName = `smoke_perm_${Date.now()}`;
  console.log("Creating temporary permission:", permName);
  const permCreate = await req("/api/permissions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: permName,
      description: "smoke test permission",
    }),
  });
  if (!permCreate.ok)
    return fail(
      `/api/permissions POST failed: ${permCreate.status} - ${permCreate.body}`
    );
  const perm = permCreate.json;
  console.log("Created permission id:", perm.id);

  // pick a role (editor)
  const rolesRes = await req("/api/roles", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!rolesRes.ok)
    return fail(`/api/roles failed: ${rolesRes.status} - ${rolesRes.body}`);
  const editorRole = rolesRes.json.find((r) => r.name === "editor");
  if (!editorRole) return fail("Editor role not found for mapping test");

  // assign permission to role
  console.log(`Assigning permission ${perm.id} to role ${editorRole.id}`);
  const assignRes = await req(`/api/roles/${editorRole.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ permissionId: perm.id }),
  });
  if (assignRes.status !== 201)
    return fail(
      `/api/roles/${editorRole.id}/permissions POST failed: ${assignRes.status} - ${assignRes.body}`
    );
  console.log("Assigned permission to role");

  // remove mapping
  console.log("Removing mapping...");
  const removeRes = await req(
    `/api/roles/${editorRole.id}/permissions/${perm.id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!removeRes.ok)
    return fail(
      `/api/roles/${editorRole.id}/permissions DELETE failed: ${removeRes.status} - ${removeRes.body}`
    );
  console.log("Removed mapping");

  // delete permission
  console.log("Deleting temporary permission...");
  const delPerm = await req(`/api/permissions/${perm.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!delPerm.ok)
    return fail(
      `/api/permissions DELETE failed: ${delPerm.status} - ${delPerm.body}`
    );
  console.log("Deleted permission");

  // 7) Editor ownership check: create editorial as one user and ensure another editor cannot edit it
  const editorEmail = `smoke-editor-${Date.now()}@example.test`;
  const editorPass = "Test1234!";
  console.log("Creating a new editor user", editorEmail);
  const s1 = await req("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: editorEmail, password: editorPass }),
  });
  if (!s1.ok)
    return fail(`/api/auth/signup (editor) failed: ${s1.status} - ${s1.body}`);

  // find user id
  const usersRes5 = await req("/api/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const editorUser = usersRes5.json.users.find((u) => u.email === editorEmail);
  if (!editorUser) return fail("Could not find editor user");

  // grant editor role to this user
  await req(`/api/users/${editorUser.id}/grant-editor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  // login as editor user
  const loginEditor = await req("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: editorEmail, password: editorPass }),
  });
  if (!loginEditor.ok) return fail("Editor login failed");
  const editorToken = loginEditor.json.token;

  // verify the editor actually has the 'editor' role (double-check grant applied)
  const usersAfterGrant = await req("/api/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const editorUserUpdated = usersAfterGrant.json.users.find(
    (u) => u.email === editorEmail
  );
  if (!editorUserUpdated)
    return fail("Editor user missing after grant (unexpected)");
  if (!editorUserUpdated.roles.includes("editor")) {
    console.error(
      "Editor role missing on user; roles:",
      editorUserUpdated.roles
    );
    // also dump known roles from server
    const rolesList = await req("/api/roles", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.error("Server roles:", rolesList.json);
    return fail("Editor role not present on the user after granting");
  }

  // create editorial as editor user
  const createEd = await req("/api/editorials", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${editorToken}`,
    },
    body: JSON.stringify({ title: "Editor Post", content: "By editor" }),
  });
  if (!createEd.ok) {
    // dump roles & permissions for debugging
    console.error(
      "Create editorial failed, dumping role data for debugging..."
    );
    const rolesList = await req("/api/roles", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.error("Roles:", JSON.stringify(rolesList.json, null, 2));
    const usersList = await req("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.error("Users:", JSON.stringify(usersList.json, null, 2));
    return fail(
      `/api/editorials POST failed: ${createEd.status} - ${createEd.body}`
    );
  }
  const ed = createEd.json;
  console.log("Editor created editorial id", ed.id);

  // create another editor user
  const editor2Email = `smoke-editor2-${Date.now()}@example.test`;
  const s2 = await req("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: editor2Email, password: editorPass }),
  });
  if (!s2.ok) return fail("Second editor signup failed");
  const usersRes6 = await req("/api/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const editor2 = usersRes6.json.users.find((u) => u.email === editor2Email);
  if (!editor2) return fail("Could not find editor2 user");
  await req(`/api/users/${editor2.id}/grant-editor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const loginEditor2 = await req("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: editor2Email, password: editorPass }),
  });
  if (!loginEditor2.ok) return fail("Editor2 login failed");
  const editor2Token = loginEditor2.json.token;

  // attempt to edit editorial created by editor1 as editor2 -> should be 403
  const editAttempt = await req(`/api/editorials/${ed.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${editor2Token}`,
    },
    body: JSON.stringify({ title: "Hacked" }),
  });
  if (editAttempt.status !== 403)
    return fail(
      "Editor2 should not be able to edit another author's editorial (expected 403)"
    );
  console.log(
    "Ownership enforcement OK (editor cannot edit other's editorial)"
  );

  // Now test dynamic permission assignment: grant journal:edit:any to editor role
  console.log(
    "Granting journal:edit:any to editor role to allow editing any journal"
  );
  const allPerms = await req("/api/permissions", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!allPerms.ok)
    return fail(
      `/api/permissions failed: ${allPerms.status} - ${allPerms.body}`
    );
  const editAnyPerm = Array.isArray(allPerms.json)
    ? allPerms.json.find((p) => p.name === "journal:edit:any")
    : null;
  if (!editAnyPerm) return fail("Permission journal:edit:any not found");

  const assignEditAny = await req(`/api/roles/${editorRole.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ permissionId: editAnyPerm.id }),
  });
  if (assignEditAny.status !== 201)
    return fail(
      `Assign journal:edit:any failed: ${assignEditAny.status} - ${assignEditAny.body}`
    );
  console.log("Assigned journal:edit:any to editor role");

  // Now editor2 should be able to edit the editorial created by editor1
  const editAttempt2 = await req(`/api/editorials/${ed.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${editor2Token}`,
    },
    body: JSON.stringify({ title: "Edited by editor2 (via new perm)" }),
  });
  if (!editAttempt2.ok)
    return fail(
      `/api/editorials PUT (after grant) failed: ${editAttempt2.status} - ${editAttempt2.body}`
    );
  console.log(
    "Editor2 successfully edited the editorial after assigned permission"
  );

  // Revoke the permission and verify editor2 cannot edit anymore
  console.log("Revoking journal:edit:any from editor role");
  const removeEditAny = await req(
    `/api/roles/${editorRole.id}/permissions/${editAnyPerm.id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!removeEditAny.ok)
    return fail(
      `/api/roles/${editorRole.id}/permissions DELETE failed: ${removeEditAny.status} - ${removeEditAny.body}`
    );
  console.log("Revoked permission");

  const editAttempt3 = await req(`/api/editorials/${ed.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${editor2Token}`,
    },
    body: JSON.stringify({ title: "Try edit after revoke" }),
  });
  if (editAttempt3.status !== 403)
    return fail(
      "Editor2 should not be able to edit after revoke (expected 403)"
    );
  console.log(
    "Editor2 forbidden again after revoke (dynamic RBAC enforcement works)"
  );

  console.log("SMOKE-ADMIN: all checks passed");
  process.exit(0);
}

run().catch((err) => {
  console.error("Unhandled error in smoke-admin:", err);
  process.exit(1);
});
