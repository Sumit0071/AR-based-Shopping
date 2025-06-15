import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

// Supabase Client Configuration with Service Role Key
// This bypasses Row Level Security (RLS) and provides full database access
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Direct Database Connection (Transaction Pooler - Recommended)
// Use this for direct SQL queries when you need more control
export const sql = postgres(process.env.DATABASE_URL!, {
  max: 10, // Maximum number of connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Timeout for new connections
  prepare: false, // Disable prepared statements for better pooling
});

// Database connection test
export const testConnection = async () => {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connected successfully:', result[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Test Supabase service role connection
export const testSupabaseConnection = async () => {
  try {
    // Test by using a simple RPC call that works with service role
    // This will confirm the service role has proper access
    const { data, error } = await supabase.rpc('version');
    
    if (error) {
      // If RPC doesn't work, try a simple auth admin call
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });
      
      if (userError) throw userError;
      
      console.log('✅ Supabase service role connected successfully (via auth admin)');
      return true;
    }
    
    console.log('✅ Supabase service role connected successfully (via RPC)');
    return true;
  } catch (error) {
    console.error('❌ Supabase service role connection failed:', error);
    return false;
  }
};

// Graceful shutdown
process.on('beforeExit', () => {
  sql.end();
}); 