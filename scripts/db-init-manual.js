/**
 * 数据库初始化脚本 - 使用 pg 的多重查询
 */

const { Client } = require('../web/node_modules/pg');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.csysmreidiksphqdihex',
  password: 'oW8Omb49mE8oS69u',
  ssl: { rejectUnauthorized: false }
};

const supabaseDir = path.join(__dirname, '..', 'supabase');

async function runSQLFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');

  // 使用 query() 直接执行整个文件，pg 支持多重查询
  // 但需要处理 GO 语句和注释
  const statements = [];

  let current = '';
  let inComment = false;
  let inDollarQuote = false;
  let dollarTag = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    // Handle comments
    if (!inDollarQuote && ch === '-' && sql[i + 1] === '-') {
      inComment = true;
      i++;
      continue;
    }
    if (inComment) {
      if (ch === '\n') {
        inComment = false;
      }
      continue;
    }

    // Handle dollar quotes
    if (!inComment && ch === '$') {
      let j = i + 1;
      let tag = '';
      while (j < sql.length && sql[j] !== '$' && !/\s/.test(sql[j])) {
        tag += sql[j];
        j++;
      }
      if (sql[j] === '$' && tag.length > 0) {
        inDollarQuote = !inDollarQuote;
        dollarTag = '$' + tag + '$';
      }
    }

    if (!inDollarQuote && !inComment && ch === ';') {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  // Execute each statement
  for (const stmt of statements) {
    if (!stmt || stmt.startsWith('--')) continue;
    try {
      await client.query(stmt);
    } catch (e) {
      // 忽略 "already exists" 等非关键错误
      if (!e.message.includes('already exists') &&
          !e.message.includes('does not exist') &&
          !e.message.includes('PGTRGR')) {
        console.warn(`  Warning: ${e.message.substring(0, 100)}`);
      }
    }
  }
}

async function runMigrations() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database');

    // Run migrations
    const migrationsDir = path.join(supabaseDir, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files`);

    for (const file of files) {
      console.log(`Running migration: ${file}`);
      await runSQLFile(client, path.join(migrationsDir, file));
      console.log(`Completed: ${file}`);
    }

    // Run seeds
    const seedDir = path.join(supabaseDir, 'seed');
    if (fs.existsSync(seedDir)) {
      const seedFiles = fs.readdirSync(seedDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      console.log(`\nFound ${seedFiles.length} seed files`);

      for (const file of seedFiles) {
        console.log(`Running seed: ${file}`);
        await runSQLFile(client, path.join(seedDir, file));
        console.log(`Completed: ${file}`);
      }
    }

    console.log('\n✅ Database initialization completed!');

    // Verify tables
    console.log('\nVerifying tables...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Tables created:', result.rows.map(r => r.table_name).join(', '));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
