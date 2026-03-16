import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: "postgres://postgres:pwd4neolyst@db.lvakvjjnyvcrwacjwjcn.supabase.co:5432/postgres"
});

await client.connect();

// 修复 email_change 字段
const result = await client.query("UPDATE auth.users SET email_change = '' WHERE email_change IS NULL");
console.log(`Fixed email_change: ${result.rowCount} rows`);

await client.end();
