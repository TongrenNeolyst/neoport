import fs from "node:fs";
import dns from "node:dns/promises";
import path from "node:path";

import pg from "pg";

const { Client } = pg;

function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!key) continue;
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function readTokenFile(p) {
  if (!fs.existsSync(p)) return null;
  const v = fs.readFileSync(p, "utf8").trim();
  return v ? v : null;
}

function supabaseRefFromUrl(url) {
  const m = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/i);
  return m?.[1] ?? null;
}

async function connectDb({ host, port, database, user, password }) {
  // Try IPv4 first if available, then IPv6, then hostname as-is.
  const candidates = [];
  try {
    const all = await dns.lookup(host, { all: true });
    const sorted = all.slice().sort((a, b) => (a.family ?? 0) - (b.family ?? 0));
    for (const a of sorted) candidates.push(a.address);
  } catch {
    // ignore
  }
  candidates.push(host);

  let lastErr = null;
  for (const h of candidates) {
    const client = new Client({
      host: h,
      port,
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15_000,
    });

    try {
      await client.connect();
      return client;
    } catch (e) {
      lastErr = e;
      try {
        await client.end();
      } catch {
        // ignore
      }
    }
  }

  throw lastErr ?? new Error("Failed to connect to DB.");
}

async function main() {
  loadDotenv(path.join(process.cwd(), ".env"));

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const ref = supabaseRefFromUrl(supabaseUrl);
  if (!ref) throw new Error("Unable to parse project ref from NEXT_PUBLIC_SUPABASE_URL.");

  const repoRoot = path.resolve(process.cwd(), "..");
  const dbPassword = readTokenFile(
    path.join(repoRoot, "supabase", "supabase_db_password.token"),
  );
  if (!dbPassword) throw new Error("Missing supabase_db_password.token");

  const host = `db.${ref}.supabase.co`;
  const client = await connectDb({
    host,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: dbPassword,
  });

  try {
    // 1.4 default admin exists + idempotent (password not reset).
    // Run idempotency check inside a transaction and rollback, to avoid touching Auth rows.
    {
      const adminEmail = "admin@neolyst.com";
      const before = await client.query(
        "select id, email, encrypted_password, raw_app_meta_data->>'role' as role from auth.users where lower(email)=lower($1) limit 1",
        [adminEmail],
      );
      if (before.rows.length !== 1) throw new Error("Default admin row missing.");
      if (before.rows[0].role !== "admin") throw new Error("Default admin role != admin.");
      const encryptedBefore = before.rows[0].encrypted_password;

      const migPath = path.join(
        repoRoot,
        "supabase",
        "migrations",
        "20260215122100_init_default_admin.sql",
      );
      const migSql = fs.readFileSync(migPath, "utf8");

      await client.query("begin");
      try {
        await client.query(migSql);
        const after = await client.query(
          "select encrypted_password, raw_app_meta_data->>'role' as role from auth.users where lower(email)=lower($1) limit 1",
          [adminEmail],
        );
        if (after.rows.length !== 1) {
          throw new Error("Default admin row missing after re-run.");
        }
        if (after.rows[0].role !== "admin") {
          throw new Error("Default admin role != admin after re-run.");
        }
        if (after.rows[0].encrypted_password !== encryptedBefore) {
          throw new Error("Default admin password was reset (encrypted_password changed).");
        }
      } finally {
        await client.query("rollback");
      }

      console.log("[OK] 1.4 default admin exists; migration idempotent; password unchanged");
    }

    // 2.4 RLS checks (simulate authenticated claims).
    async function withJwtClaims(claims, fn) {
      await client.query("begin");
      try {
        // Ensure policies match `to authenticated`.
        await client.query("set local role authenticated");

        // Supabase uses this GUC for auth helpers.
        await client.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify(claims),
        ]);

        // Confirm `auth.jwt()` sees our claims.
        const jwt = await client.query("select auth.jwt() as jwt");
        if (!jwt.rows?.[0]?.jwt) throw new Error("auth.jwt() returned null");

        await fn();
        await client.query("rollback");
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
    }

    // Authenticated (analyst) can SELECT.
    await withJwtClaims({ app_metadata: { role: "analyst" } }, async () => {
      await client.query("select id from public.region limit 1");
      await client.query("select id from public.analyst limit 1");
    });
    console.log("[OK] 2.4 authenticated SELECT allowed (region/analyst)");

    // Non-admin writes denied.
    await withJwtClaims({ app_metadata: { role: "analyst" } }, async () => {
      let denied = 0;
      try {
        await client.query(
          "insert into public.region (name, code) values ($1, $2)",
          ["__rls_test_region__", "__rls__"],
        );
      } catch {
        denied += 1;
      }
      try {
        await client.query(
          "insert into public.analyst (full_name, email) values ($1, $2)",
          ["Nope", "nope@example.com"],
        );
      } catch {
        denied += 1;
      }
      if (denied !== 2) throw new Error("Expected non-admin writes to be denied by RLS.");
    });
    console.log("[OK] 2.4 non-admin writes denied (region/analyst)");

    // Admin writes allowed (and cleanup).
    await withJwtClaims({ app_metadata: { role: "admin" } }, async () => {
      const regionName = `__rls_test_region_${Date.now()}`;
      const regionCode = `__rls_${Date.now().toString(36)}`;

      const insRegion = await client.query(
        "insert into public.region (name, code) values ($1, $2) returning id",
        [regionName, regionCode],
      );
      const regionId = insRegion.rows[0].id;

      const insAnalyst = await client.query(
        "insert into public.analyst (full_name, email, region_id) values ($1, $2, $3) returning id",
        ["RLS Test", `rls-${Date.now()}@example.com`, regionId],
      );
      const analystId = insAnalyst.rows[0].id;

      await client.query("delete from public.analyst where id=$1", [analystId]);
      await client.query("delete from public.region where id=$1", [regionId]);
    });
    console.log("[OK] 2.4 admin writes allowed (region/analyst)");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[FAIL]", e?.message ?? e);
  process.exit(1);
});
