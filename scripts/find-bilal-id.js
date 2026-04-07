const { Client } = require('pg'); 

const client = new Client({
  connectionString: 'postgresql://postgres:Bloch%405529741@db.ayhawnmdihynhstmabpi.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  
  try {
    const res = await client.query(`SELECT id, full_name, email FROM auth.users u LEFT JOIN public.profiles p ON u.id = p.id WHERE p.full_name ILIKE '%BILAL NAZAM%' OR u.email ILIKE '%bilalnazam%'`);
    console.log("Profiles found:", JSON.stringify(res.rows, null, 2));
  } catch(e) { 
    console.error("Error profiles:", e.message); 
  }

  await client.end();
}
run();
