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

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function readTokenFile(p) {
  if (!fs.existsSync(p)) return null;
  const v = readText(p).trim();
  return v ? v : null;
}

async function q(client, sql, params = []) {
  const res = await client.query(sql, params);
  return res.rows;
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

  const repoRoot = path.resolve(process.cwd(), "..");
  const pwPath = path.join(repoRoot, "supabase", "supabase_db_password.token");
  const dbPassword = readTokenFile(pwPath);
  if (!dbPassword) throw new Error(`Missing DB password token: ${pwPath}`);

  const ref =
    process.env.SUPABASE_PROJECT_REF ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/(.*?)\.supabase\.co/i)?.[1] ??
    null;
  if (!ref) throw new Error("Missing SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL.");

  const host = `db.${ref}.supabase.co`;
  const client = await connectDb({
    host,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: dbPassword,
  });

  try {
    const basics = await q(
      client,
      "select current_database() as db, current_user as user, version() as version",
    );
    console.log({ basics });

    const schemas = await q(
      client,
      "select schema_name from information_schema.schemata where schema_name in ('auth','extensions','storage','realtime','supabase_migrations','pgbouncer') order by schema_name",
    );
    console.log({ schemas });

    const authTables = await q(
      client,
      "select table_name from information_schema.tables where table_schema='auth' order by table_name",
    );
    console.log({ authTablesCount: authTables.length, authTables: authTables.slice(0, 30) });

    const authUsersRegclass = await q(client, "select to_regclass('auth.users') as auth_users");
    console.log({ authUsersRegclass });

    const authIdentitiesRegclass = await q(
      client,
      "select to_regclass('auth.identities') as auth_identities",
    );
    console.log({ authIdentitiesRegclass });

    const roles = await q(
      client,
      "select rolname from pg_roles where rolname in ('supabase_auth_admin','supabase_admin','authenticator','anon','authenticated','service_role') order by rolname",
    );
    console.log({ roles });

    // Verify the default admin row existence.
    const admin = await q(
      client,
      "select id, email, raw_app_meta_data->>'role' as role, created_at from auth.users where lower(email)=lower($1) limit 1",
      ["admin@neolyst.com"],
    );
    console.log({ defaultAdminRow: admin });

    // Simple auth schema queries gotrue commonly relies on.
    const gotrueSmoke1 = await q(
      client,
      "select count(*)::int as users from auth.users",
    );
    const gotrueSmoke2 = await q(
      client,
      "select count(*)::int as identities from auth.identities",
    );
    console.log({ gotrueSmoke1, gotrueSmoke2 });
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[FAIL]", e?.message ?? e);
  process.exit(1);
});
