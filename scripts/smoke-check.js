/* eslint-disable no-console */
// Simple smoke check script for local dev server
// Usage: BASE_URL=http://localhost:3001 node scripts/smoke-check.js

const BASE = process.env.BASE_URL || "http://localhost:3000";
const timeout = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: text };
}

async function waitForServer({ timeoutMs = 10000, intervalMs = 500 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE + "/");
      if (res.ok) return true;
    } catch {
      // ignore and retry
    }
    await timeout(intervalMs);
  }
  return false;
}

async function run() {
  console.log(`Running smoke checks against ${BASE}`);

  const up = await waitForServer({ timeoutMs: 15000, intervalMs: 500 });
  if (!up) {
    console.error(`Server at ${BASE} did not become ready within timeout`);
    process.exit(1);
  }

  console.log("Server is responding, starting checks...");

  try {
    const home = await req("/");
    if (!home.ok) throw new Error(`/ failed: status ${home.status}`);
    console.log("✔ / served");

    const login = await req("/login");
    if (!login.ok) throw new Error(`/login failed: status ${login.status}`);
    console.log("✔ /login served");

    const signup = await req("/signup");
    if (!signup.ok) throw new Error(`/signup failed: status ${signup.status}`);
    console.log("✔ /signup served");

    // Try creating a transient test user (timestamped) and then logging in
    const email = `smoke+${Date.now()}@example.test`;
    const password = "Test1234!";

    const signRes = await fetch(`${BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (![200, 201].includes(signRes.status)) {
      const text = await signRes.text();
      throw new Error(
        `/api/auth/signup failed: status ${signRes.status} - ${text}`
      );
    }
    console.log("✔ /api/auth/signup succeeded");

    // login
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) {
      const text = await loginRes.text();
      throw new Error(
        `/api/auth/login failed: status ${loginRes.status} - ${text}`
      );
    }

    const data = await loginRes.json();
    if (!data?.token) throw new Error("/api/auth/login did not return token");
    console.log("✔ /api/auth/login returned token");

    // call /api/auth/me with token
    const meRes = await fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });

    if (!meRes.ok) {
      const text = await meRes.text();
      throw new Error(`/api/auth/me failed: status ${meRes.status} - ${text}`);
    }

    const meData = await meRes.json();
    if (!Array.isArray(meData?.user?.roles)) {
      throw new Error(`/api/auth/me did not return roles array`);
    }

    console.log("✔ /api/auth/me returned user info (roles ok)");

    console.log("All smoke checks passed");
    process.exit(0);
  } catch (err) {
    console.error(
      "Smoke check failed:",
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }
}

run();
