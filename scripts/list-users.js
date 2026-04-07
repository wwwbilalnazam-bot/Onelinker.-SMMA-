const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ayhawnmdihynhstmabpi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5aGF3bm1kaWh5bmhzdG1hYnBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYwMDI2MCwiZXhwIjoyMDg5MTc2MjYwfQ.qfDa4i25-YdlwYJCLpdtJYwMdJRT_JPU146igbbmUYk'
);

async function checkAll() {
  const { data: users } = await supabase.from('profiles').select('id, full_name');
  console.log("All profiles:", JSON.stringify(users, null, 2));

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  console.log("Auth users:", JSON.stringify(authUsers.users.map(u => ({ id: u.id, email: u.email })), null, 2));
}
checkAll();
