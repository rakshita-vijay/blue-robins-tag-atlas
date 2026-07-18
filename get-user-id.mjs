// get-user-id.mjs
// Run this once to find your Supabase auth user_id.
// Usage: node get-user-id.mjs you@example.com

import { createClient } from '@supabase/supabase-js';

const [, , email] = process.argv;

if (!email) {
  console.error('Usage: node get-user-id.mjs your@email.com');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.listUsers();

if (error) {
  console.error('Error listing users:', error.message);
  process.exit(1);
}

const match = data.users.find((u) => u.email === email);

if (!match) {
  console.error(`No user found with email ${email}. Have you signed in at least once on the site?`);
  process.exit(1);
}

console.log('Found your user_id:');
console.log(match.id);
console.log('\nCopy this value — you\'ll paste it into bulk-add-projects.mjs as USER_ID.');
