import express, { Express, Request, Response } from 'express';
import { supabase, sql, testConnection, testSupabaseConnection } from './config/supabase';

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Test both database connections on startup
const initializeConnections = async () => {
  await testConnection();
  await testSupabaseConnection();
};

initializeConnections();

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, TypeScript with Express!');
});

// Example route using Supabase client with service role (bypasses RLS)
app.get('/api/test-supabase', async (req: Request, res: Response) => {
    try {
        // Test service role by listing users (admin operation)
        const { data, error } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 5
        });
            
        if (error) throw error;
        
        res.json({ 
            message: 'Supabase service role working!', 
            userCount: data.users.length,
            totalUsers: data.total,
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        res.status(500).json({ error: 'Supabase connection failed', details: error });
    }
});

// Example route for creating/managing users (service role only)
app.post('/api/admin/create-user', async (req: Request, res: Response) => {
    try {
        const { email, password, user_metadata } = req.body;
        
        // Only service role can create users programmatically
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            user_metadata,
            email_confirm: true // Auto-confirm email for admin-created users
        });
        
        if (error) throw error;
        
        res.json({
            message: 'User created successfully',
            user: data.user
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user', details: error });
    }
});

// Example route for admin operations (service role bypasses RLS)
app.get('/api/admin/users', async (req: Request, res: Response) => {
    try {
        // List all users - only possible with service role
        const { data, error } = await supabase.auth.admin.listUsers();
        
        if (error) throw error;
        
        res.json({
            message: 'Users retrieved successfully',
            users: data.users,
            total: data.users.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve users', details: error });
    }
});

// Example route using direct database connection (for complex queries)
app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await sql`
            SELECT 
                current_database() as database,
                current_user as user,
                version() as version,
                NOW() as timestamp
        `;
        
        res.json({ 
            message: 'Direct database connection working!', 
            data: result[0] 
        });
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed', details: error });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
