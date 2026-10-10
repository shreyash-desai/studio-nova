```dotenv
SUPABASE_URL=https://ohddujncvzsullwyjyaw.supabase.co
SUPABASE_PUBLISHABLE_KEY=PASTE_YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=PASTE_YOUR_SUPABASE_SECRET_OR_SERVICE_ROLE_KEY_HERE
SITE_PASSWORD=SSLD
SESSION_SECRET=PASTE_YOUR_GENERATED_RANDOM_SESSION_SECRET_HERE
```

## Vercel Setup Instructions

You must add these environment variables in your Vercel dashboard:
1. Go to **Project → Settings → Environment Variables**.
2. Add each of the variables above.
3. For the environments to select: Check **Production**, **Preview**, and **Development** so that `vercel env pull` works correctly in the future.
4. **IMPORTANT:** Replace the placeholders with the actual values. `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must be copied from your Supabase Project API settings. `SESSION_SECRET` must be generated locally as a strong random string (at least 32 characters).
5. **Redeploy** the application after changing Production variables so the changes take effect.

**Note on variables:**
- `SUPABASE_URL`: Required.
- `SUPABASE_SERVICE_ROLE_KEY`: Required. This is the privileged server-only key.
- `SITE_PASSWORD`: Required. Used for application access.
- `SESSION_SECRET`: Required. Used to sign session cookies securely.
- `SUPABASE_PUBLISHABLE_KEY`: Optional. Based on the code audit, all database operations occur strictly server-side using the service role key. The frontend no longer accesses Supabase directly. Therefore, the publishable key is not currently required by the application's implementation, but the placeholder is provided should you need it for future architecture changes.
