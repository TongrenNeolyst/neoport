import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: "postgres://postgres:pwd4neolyst@db.lvakvjjnyvcrwacjwjcn.supabase.co:5432/postgres"
});

await client.connect();

// 检查 identities 表的 NULL 字段
const identities = await client.query("SELECT * FROM auth.identities WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@neolyst.com')");
console.log("Identities NULL fields:");
if (identities.rows.length > 0) {
  const nullFields = Object.entries(identities.rows[0]).filter(([k, v]) => v === null);
  nullFields.forEach(([k]) => console.log(" -", k));
}

// 修复 identities 表的可能问题字段
await client.query("UPDATE auth.identities SET provider_id = email WHERE provider_id IS NULL AND provider = 'email'");
console.log("Fixed identities.provider_id");

await client.end();
