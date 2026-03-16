import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: "postgres://postgres:pwd4neolyst@db.lvakvjjnyvcrwacjwjcn.supabase.co:5432/postgres"
});

await client.connect();

// 查看当前用户的 NULL 字段
const user = await client.query("SELECT * FROM auth.users WHERE email = 'admin@neolyst.com'");
console.log("Current user NULL fields:");
const nullFields = Object.entries(user.rows[0]).filter(([k, v]) => v === null);
nullFields.forEach(([k]) => console.log(" -", k));

await client.end();
