const url = 'https://ormtnujhlrlghophotfr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ybXRudWpobHJsZ2hvcGhvdGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNzc1MDgsImV4cCI6MjA4Nzc1MzUwOH0._aG-KZuKCCqZLkMCr-9sKknvLlnuV8SUBQI0i6HdFzI';

async function test() {
  console.log("Pinging edge function directly...");
  
  const res = await fetch(`${url}/functions/v1/generate-payroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ runId: 'fake-id' })
  });
  
  console.log(`STATUS:`, res.status);
  console.log(`HEADERS:`, Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log(`BODY:`, text);
}

test().catch(console.error);
