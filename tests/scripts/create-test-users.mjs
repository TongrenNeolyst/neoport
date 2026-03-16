/**
 * Create test users using Supabase Admin API
 *
 * Usage:
 *   cd tests
 *   pnpm run setup:test-users
 *   # OR
 *   node scripts/create-test-users.mjs
 *
 * Requires: @supabase/supabase-js (installed in tests/package.json)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read tokens from files
const serviceRoleKey = readFileSync(
  join(__dirname, '../../supabase/supabase_service_role_key.token'),
  'utf-8'
).trim();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lvakvjjnyvcrwacjwjcn.supabase.co';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser(email, password, role, fullName) {
  console.log(`Creating user: ${email}`);

  // Check if user exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError.message);
    return false;
  }

  const existingUser = users.find(u => u.email === email);

  if (existingUser) {
    console.log(`User ${email} already exists, updating...`);

    // Update user with correct role
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        email_confirm: true,
        user_metadata: { full_name: fullName },
        app_metadata: { role }
      }
    );

    if (updateError) {
      console.error('Error updating user:', updateError.message);
      return false;
    }

    console.log(`User ${email} updated successfully`);
    return true;
  }

  // Create new user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role }
  });

  if (error) {
    console.error('Error creating user:', error.message);
    return false;
  }

  console.log(`User ${email} created successfully with ID: ${data.user.id}`);
  return true;
}

async function main() {
  console.log('Creating test users...\n');

  // Create SA (Senior Analyst) test user
  await createTestUser(
    'sa@neolyst.com',
    'Analyst123',
    'sa',
    'Test Senior Analyst'
  );

  // Create Analyst test user (for owner access control tests)
  await createTestUser(
    'analyst@neolyst.com',
    'Analyst123',
    'analyst',
    'Test Analyst'
  );

  console.log('\nDone!');
}

main().catch(console.error);
