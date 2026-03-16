/**
 * Initialize Auth users using Supabase Admin API
 *
 * Usage:
 *   pnpm run seed:auth
 *   # or
 *   npx tsx supabase/seed.ts
 *
 * Environment variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface UserConfig {
  email: string;
  password: string;
  role: string;
  fullName: string;
}

const DEFAULT_USERS: UserConfig[] = [
  {
    email: "admin@neolyst.com",
    password: "Admin123",
    role: "admin",
    fullName: "System Administrator",
  },
  {
    email: "sa@neolyst.com",
    password: "Analyst123",
    role: "sa",
    fullName: "Test Senior Analyst",
  },
];

async function createOrUpdateUser(config: UserConfig): Promise<boolean> {
  console.log(`Processing user: ${config.email}`);

  // Check if user exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error(`Error listing users: ${listError.message}`);
    return false;
  }

  const existingUser = users.find((u) => u.email === config.email);

  if (existingUser) {
    console.log(`User ${config.email} already exists, updating...`);

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        email_confirm: true,
        user_metadata: { full_name: config.fullName },
        app_metadata: { role: config.role },
      }
    );

    if (updateError) {
      console.error(`Error updating user: ${updateError.message}`);
      return false;
    }

    console.log(`User ${config.email} updated successfully`);
    return true;
  }

  // Create new user
  const { data, error } = await supabase.auth.admin.createUser({
    email: config.email,
    password: config.password,
    email_confirm: true,
    user_metadata: { full_name: config.fullName },
    app_metadata: { role: config.role },
  });

  if (error) {
    console.error(`Error creating user: ${error.message}`);
    return false;
  }

  console.log(`User ${config.email} created successfully with ID: ${data.user.id}`);
  return true;
}

async function main() {
  console.log("Initializing Auth users...\n");
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  let success = true;

  for (const user of DEFAULT_USERS) {
    const result = await createOrUpdateUser(user);
    if (!result) {
      success = false;
    }
  }

  console.log("\nDone!");

  if (!success) {
    console.error("\nSome users failed to initialize.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
