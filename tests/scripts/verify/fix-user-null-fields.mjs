import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: "postgres://postgres:pwd4neolyst@db.lvakvjjnyvcrwacjwjcn.supabase.co:5432/postgres"
});

await client.connect();

// 修复所有可能需要的 token/字符串字段
const fieldsToFix = [
  "confirmation_token",
  "recovery_token",
  "email_change_token_new",
  "email_change_token_current"
];

for (const field of fieldsToFix) {
  const result = await client.query(`UPDATE auth.users SET ${field} = '' WHERE ${field} IS NULL`);
  console.log(`Fixed ${field}: ${result.rowCount} rows`);
}

console.log("Done!");
await client.end();
