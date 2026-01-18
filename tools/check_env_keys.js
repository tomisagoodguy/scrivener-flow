const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('Available Env Vars:');
if (process.env.NEXT_PUBLIC_SUPABASE_URL) console.log('- NEXT_PUBLIC_SUPABASE_URL: ' + process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 10) + '...');
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) + '...');
if (process.env.SUPABASE_SERVICE_ROLE_KEY) console.log('- SUPABASE_SERVICE_ROLE_KEY: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...');
else console.log('- SUPABASE_SERVICE_ROLE_KEY: (MISSING)');
