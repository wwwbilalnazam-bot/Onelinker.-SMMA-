
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
  console.log('Checking inbox_messages...');
  const { data: comments, count: commentsCount, error: commentsErr } = await supabase
    .from('inbox_messages')
    .select('*', { count: 'exact' });
  
  if (commentsErr) {
    console.error('Error fetching comments:', commentsErr);
  } else {
    console.log(`Total comments: ${commentsCount}`);
    if (comments && comments.length > 0) {
      console.log('Sample comment platform:', comments[0].platform);
    }
  }

  console.log('Checking social_accounts...');
  const { data: accounts, error: accountsErr } = await supabase
    .from('social_accounts')
    .select('platform, is_active, last_synced');
  
  if (accountsErr) {
    console.error('Error fetching accounts:', accountsErr);
  } else {
    console.log(`Total accounts: ${accounts?.length || 0}`);
    console.log('Accounts:', accounts);
  }
}

checkData();
