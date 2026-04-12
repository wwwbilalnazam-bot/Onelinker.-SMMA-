require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    await client.connect();
    console.log("Connected to DB");
    await client.query("ALTER TABLE public.inbox_messages ADD COLUMN IF NOT EXISTS reply_text TEXT;");
    await client.query("ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_text TEXT;");
    console.log("Added reply_text columns to both tables");
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
