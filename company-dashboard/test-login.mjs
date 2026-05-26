import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin(email, password) {
  console.log(`Testing login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(`❌ Login failed for ${email}:`, error.message);
    return false;
  } else {
    console.log(`✅ Login successful for ${email}! User ID:`, data.user.id);
    return true;
  }
}

async function runLoginTests() {
  const tenantEmail = process.env.TEST_TENANT_EMAIL || 'tenant@test.com';
  const tenantPass = process.env.TEST_TENANT_PASSWORD || 'Test1234!';
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@test.com';
  const adminPass = process.env.TEST_ADMIN_PASSWORD || 'Admin1234!';

  await testLogin(tenantEmail, tenantPass);
  await testLogin(adminEmail, adminPass);
}

runLoginTests();
