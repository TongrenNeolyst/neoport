const { Client } = require('../web/node_modules/pg');

const config = {
  host: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.csysmreidiksphqdihex',
  password: 'oW8Omb49mE8oS69u',
  ssl: { rejectUnauthorized: false }
};

async function confirmEmail() {
  const client = new Client(config);
  await client.connect();

  const result = await client.query(
    `UPDATE auth.users
     SET email_confirmed_at = now(),
         raw_user_meta_data = raw_user_meta_data || '{"email_verified":true}'::jsonb
     WHERE email = 'analyst@neolyst.com'
     RETURNING id, email, email_confirmed_at`
  );

  console.log('Updated user:', result.rows);
  await client.end();
}

confirmEmail().catch(console.error);
