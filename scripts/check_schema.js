
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function check() {
  console.log('Fetching columns for leave_requests...');
  // Since we can't easily query information_schema via RPC without it being set up,
  // we'll just try to select 1 row and see the keys.
  const resp = await fetch(`${url}/rest/v1/leave_requests?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const data = await resp.json();
  if (data && data.length > 0) {
    console.log('Row Keys:', Object.keys(data[0]));
  } else {
    // If empty, try to insert a dummy and rollback? No, RLS will block us.
    // Let's try to just get the 'null' version of the record if Supabase supports it
    // Actually, we can try to guess columns by picking specific ones
    const cols = ['id', 'user_id', 'status', 'approver_id', 'approver_email'];
    for (const col of cols) {
      const r = await fetch(`${url}/rest/v1/leave_requests?select=${col}&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      console.log(`Column ${col}: ${r.status === 200 ? 'EXISTS' : 'MISSING'}`);
    }
  }
}

check().catch(console.error);
