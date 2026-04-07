const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ayhawnmdihynhstmabpi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5aGF3bm1kaWh5bmhzdG1hYnBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYwMDI2MCwiZXhwIjoyMDg5MTc2MjYwfQ.qfDa4i25-YdlwYJCLpdtJYwMdJRT_JPU146igbbmUYk'
);

async function cleanup() {
  console.log("Starting cleanup...");

  // 1. Identify users with duplicates
  const targetIds = ['0a7ea0dd-8d91-46c2-b172-0c5ddedcb47b', 'c0f78164-ec60-4079-a1e4-c7fe4d9bee27'];
  
  for (const userId of targetIds) {
    console.log(`\n--- Cleaning user: ${userId} ---`);

    // 2. List all workspaces owned by user
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select(`
        id, 
        name, 
        slug, 
        created_at,
        social_accounts (id)
      `)
      .eq('owner_id', userId);

    if (wsError) {
      console.error(`Error fetching workspaces for ${userId}:`, wsError);
      continue;
    }

    console.log(`User owns ${workspaces.length} workspaces.`);

    if (workspaces.length <= 1) {
      console.log("No duplicates found to clean up.");
      continue;
    }

    // 3. Identify the one to KEEP
    const sorted = workspaces.sort((a, b) => {
      // Priority 1: Has social accounts
      const aCount = a.social_accounts?.length || 0;
      const bCount = b.social_accounts?.length || 0;
      if (aCount !== bCount) return bCount - aCount;

      // Priority 2: Name is NOT default (name contains gmail prefix or "'s Workspace")
      const aIsDefault = a.name.includes("'s Workspace") || a.name.includes("bilalnazam");
      const bIsDefault = b.name.includes("'s Workspace") || b.name.includes("bilalnazam");
      // Actually, if it's "Luxury Estates Qatar", keep that one. 
      // If none, keep oldest.
      
      if (aIsDefault !== bIsDefault) return aIsDefault ? 1 : -1;

      // Priority 3: Oldest first
      return new Date(a.created_at) - new Date(b.created_at);
    });

    const keep = sorted[0];
    const duplicates = sorted.slice(1);

    console.log(`KEEPING: "${keep.name}" (${keep.id}) created at ${keep.created_at}`);
    console.log(`DELETING ${duplicates.length} duplicates...`);

    for (const ws of duplicates) {
      console.log(`- Deleting: "${ws.name}" (${ws.id}) created at ${ws.created_at}`);
      const { error: delError } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', ws.id);
      
      if (delError) {
        console.error(`  Error deleting ${ws.id}:`, delError.message);
      } else {
        console.log(`  Successfully deleted.`);
      }
    }
  }


  console.log("Cleanup finished.");
}

cleanup();
