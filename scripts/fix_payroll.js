
const fs = require('fs');
const path = 'src/hooks/usePayroll.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix early return for existing runs
const oldCheck = /if \(existing && existing\.length > 0\) \{\s+return existing\[0\] as PayrollRun;\s+\}/;
const newCheck = `if (existing && existing.length > 0) {
        const run = existing[0] as PayrollRun;
        if (run.status !== "draft") {
          return run;
        }
      } else {
        const { data: runData, error: runError } = await supabase
          .from("payroll_runs")
          .insert({
            code,
            period_start,
            period_end,
            status: "draft",
          })
          .select("*")
          .single();
        if (runError) throw runError;
        const run = runData as PayrollRun;
      }`;

// Also wrap the creation block so it's not redundant if we use the above
// Let's just do a more surgical replacement of the whole generateMutation block if needed,
// but let's try this first.

content = content.replace(oldCheck, newCheck);

// 2. Clean up old items before insert
const oldInsert = /if \(items\.length > 0\) \{\s+const \{ error: itemsError \} = await supabase\.from\("payroll_items"\)\.insert\(items\);\s+if \(itemsError\) throw itemsError;\s+\}/;
const newInsert = `if (items.length > 0) {
        // Clear existing items for this run first to avoid duplicates
        await supabase.from("payroll_items").delete().eq("run_id", run.id);
        
        const { error: itemsError } = await supabase.from("payroll_items").insert(items);
        if (itemsError) throw itemsError;
      }`;

content = content.replace(oldInsert, newInsert);

fs.writeFileSync(path, content);
console.log('Successfully updated usePayroll.ts');
