const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ohddujncvzsullwyjyaw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZGR1am5jdnpzdWxsd3lqeWF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk1MTY1NCwiZXhwIjoyMTA0NTI3NjU0fQ.uPAboNEUB2HJfTMnjqNAChFvUiW4bD5IIv8J1z07bmU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('operators').select('*');
  console.log('Error:', error);
  console.log('Operators:', data);
}

check();
