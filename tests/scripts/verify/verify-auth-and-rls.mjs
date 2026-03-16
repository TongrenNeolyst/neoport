import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

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

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function expectRlsDenied(promise, label) {
  const res = await promise;
  if (!res.error) {
    throw new Error(`Expected RLS deny but succeeded: ${label}`);
  }
}

async function main() {
  const envPath = path.join(process.cwd(), ".env");
  loadDotenv(envPath);

  const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const ANON_KEY = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@neolyst.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin123";

  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Default admin exists + role=admin.
  {
    const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    const u = (data.users ?? []).find(
      (x) => (x.email ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    );
    if (!u) throw new Error(`Default admin not found: ${ADMIN_EMAIL}`);
    if (u.app_metadata?.role !== "admin") throw new Error("Default admin role is not admin.");
    console.log("[OK] default admin exists and role=admin");
  }

  // 2) Create an analyst user for RLS checks.
  const tag = nowTag();
  const analystEmail = `test-analyst-${tag}@example.com`;
  const analystPassword = `Test-${tag}!`;

  let analystUserId = null;
  try {
    const { data, error } = await service.auth.admin.createUser({
      email: analystEmail,
      password: analystPassword,
      email_confirm: true,
      app_metadata: { role: "analyst" },
      user_metadata: { full_name: "Test Analyst" },
    });
    if (error) throw error;
    analystUserId = data.user?.id ?? null;
    if (!analystUserId) throw new Error("Failed to create analyst user.");

    // Sign in as analyst (RLS should allow SELECT but deny writes).
    const { data: analystSession, error: analystSignInErr } =
      await anon.auth.signInWithPassword({
        email: analystEmail,
        password: analystPassword,
      });
    if (analystSignInErr) throw analystSignInErr;
    if (!analystSession.session) throw new Error("Analyst session missing.");

    console.log("[OK] analyst can sign in");

    // SELECT should be allowed for authenticated.
    {
      const r1 = await anon.from("region").select("id").limit(1);
      if (r1.error) throw new Error(`Analyst SELECT region failed: ${r1.error.message}`);

      const r2 = await anon.from("analyst").select("id").limit(1);
      if (r2.error) throw new Error(`Analyst SELECT analyst failed: ${r2.error.message}`);

      console.log("[OK] RLS: authenticated SELECT allowed (region/analyst)");
    }

    // INSERT/UPDATE/DELETE should be denied for non-admin.
    {
      await expectRlsDenied(
        anon.from("region").insert({ name: `__rls_test_region_${tag}`, code: `__${tag}` }),
        "analyst INSERT region",
      );

      await expectRlsDenied(
        anon.from("analyst").insert({ full_name: "Nope", email: `nope-${tag}@example.com` }),
        "analyst INSERT analyst",
      );

      console.log("[OK] RLS: non-admin writes denied (region/analyst)");
    }

    // Admin writes should be allowed.
    const { data: adminSession, error: adminSignInErr } = await anon.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (adminSignInErr) throw adminSignInErr;
    if (!adminSession.session) throw new Error("Admin session missing.");

    console.log("[OK] admin can sign in");

    let regionId = null;
    let analystRowId = null;
    try {
      const regionName = `__rls_test_region_${tag}`;
      const regionCode = `__${tag}`;

      const insRegion = await anon
        .from("region")
        .insert({ name: regionName, code: regionCode })
        .select("id")
        .single();
      if (insRegion.error) throw insRegion.error;
      regionId = insRegion.data?.id ?? null;
      if (!regionId) throw new Error("Missing inserted region id.");

      const insAnalyst = await anon
        .from("analyst")
        .insert({
          full_name: "RLS Test Analyst",
          chinese_name: "测试",
          email: `rls-analyst-${tag}@example.com`,
          region_id: regionId,
        })
        .select("id")
        .single();
      if (insAnalyst.error) throw insAnalyst.error;
      analystRowId = insAnalyst.data?.id ?? null;
      if (!analystRowId) throw new Error("Missing inserted analyst id.");

      console.log("[OK] RLS: admin writes allowed (region/analyst)");
    } finally {
      // Cleanup: best-effort.
      if (analystRowId) await anon.from("analyst").delete().eq("id", analystRowId);
      if (regionId) await anon.from("region").delete().eq("id", regionId);
    }
  } finally {
    // Cleanup created auth user.
    if (analystUserId) await service.auth.admin.deleteUser(analystUserId);
  }
}

main().catch((e) => {
  console.error("[FAIL]", e?.message ?? e);
  process.exit(1);
});

