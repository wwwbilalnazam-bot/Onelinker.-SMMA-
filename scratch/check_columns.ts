
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumns() {
  const { data: inbox, error: inboxErr } = await supabase
    .from('inbox_messages')
    .select('*')
    .limit(1);
  
  if (inboxErr) {
    console.error('Error fetching inbox_messages:', inboxErr);
  } else if (inbox && inbox.length > 0) {
    console.log('Columns in inbox_messages:', Object.keys(inbox[0]));
  } else {
    console.log('inbox_messages is empty, trying to get schema another way...');
    // If table is empty, we can try to insert a dummy row or just guess.
    // But since there's a record in the screenshot, it shouldn't be empty.
  }

  const { data: messages, error: messagesErr } = await supabase
    .from('messages')
    .select('*')
    .limit(1);
  
  if (messagesErr) {
    console.error('Error fetching messages:', messagesErr);
  } else if (messages && messages.length > 0) {
    console.log('Columns in messages:', Object.keys(messages[0]));
  }
}

checkColumns();
