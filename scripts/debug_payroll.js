
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugPayroll() {
  const { data: runs, error: runError } = await supabase
    .from('payroll_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (runError) {
    console.error('Runs Error:', runError)
    return
  }

  console.log('Recent Payroll Runs:', runs)

  if (runs && runs.length > 0) {
    const runId = runs[0].id
    const { data: items, error: itemsError } = await supabase
      .from('payroll_items')
      .select('*')
      .eq('run_id', runId)

    if (itemsError) {
      console.error('Items Error:', itemsError)
    } else {
      console.log(`Items for Run ${runs[0].code} (${runId}):`, items.length)
      if (items.length > 0) {
        console.log('Sample Item:', items[0])
      }
    }
  }
}

debugPayroll()
