const url = process.env.VITE_SUPABASE_URL || 'https://ormtnujhlrlghophotfr.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ybXRudWpobHJsZ2hvcGhvdGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNzc1MDgsImV4cCI6MjA4Nzc1MzUwOH0._aG-KZuKCCqZLkMCr-9sKknvLlnuV8SUBQI0i6HdFzI';

async function test() {
  console.log("Fetching draft payroll runs...");
  const res1 = await fetch(`${url}/rest/v1/payroll_runs?status=eq.draft&select=*&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res1.json();
  if (!data || data.length === 0) {
    console.log("No draft runs found. Can't test.");
    return;
  }
  const runId = data[0].id;
  console.log(`Found draft run: ${runId}. Pinging edge function...`);
  
  const res2 = await fetch(`${url}/functions/v1/generate-payroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ runId })
  });
  
  console.log(`HTTP Status:`, res2.status);
  const text = await res2.text();
  console.log(`Response Body:`, text);
}

test().catch(console.error);
