# Supabase Migrations

This directory contains SQL migration files for setting up the SnapReceipt database schema in Supabase.

## Prerequisites

- A [Supabase](https://supabase.com) account
- A Supabase project created
- Access to your project's SQL Editor

## Migration Files

The migrations are numbered sequentially and should be executed in order:

1. **001_initial_schema.sql** - Creates the main `receipts` table with all necessary fields and indexes
2. **002_auth_setup.sql** - Sets up authentication schema and user profiles table
3. **003_rls_policies.sql** - Configures Row Level Security (RLS) policies for data isolation
4. **004_user_settings.sql** - Creates user settings table for storing Gemini API keys
5. **005_storage_policies.sql** - Configures storage bucket policies for receipt images

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended for beginners)

1. **Navigate to SQL Editor**
   - Go to your Supabase project dashboard
   - Click on "SQL Editor" in the left sidebar

2. **Execute Migrations in Order**
   - Open the first migration file (`001_initial_schema.sql`)
   - Copy the entire content
   - Paste it into the SQL Editor
   - Click "Run" button
   - Repeat for each migration file in order

3. **Verify Execution**
   - Check the output panel for any errors
   - Go to "Table Editor" to verify tables were created
   - Go to "Authentication" > "Policies" to verify RLS policies

### Option 2: Using Supabase CLI

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link Your Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Apply Migrations**
   ```bash
   supabase db push
   ```

## Storage Setup

After running the migrations, you need to create the storage bucket:

1. **Create Receipts Bucket**
   - Go to "Storage" in your Supabase dashboard
   - Click "Create bucket"
   - Name: `receipts`
   - Make it **public** if you want receipt images to be publicly accessible, or **private** for user-only access
   - Click "Create bucket"

2. **Storage Structure**
   - The app will store images in the following structure: `receipts/{user_id}/{filename}`
   - This allows RLS policies to work correctly

## Database Schema Overview

### Tables Created

#### `receipts`
Stores receipt information extracted from images.
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to auth.users (who created the receipt)
- `date` (TEXT) - Receipt date in YYYY-MM-DD format
- `total` (NUMERIC) - Total amount
- `merchant` (TEXT) - Store/merchant name
- `items` (JSONB) - Array of items (optional)
- `category` (TEXT) - Receipt category (groceries, restaurant, etc.)
- `image_url` (TEXT) - URL to receipt image in storage
- `created_at` (TIMESTAMP) - When record was created
- `updated_at` (TIMESTAMP) - When record was last updated

#### `profiles`
Stores additional user profile information.
- `id` (UUID) - Primary key, references auth.users
- `email` (TEXT) - User email
- `full_name` (TEXT) - User's full name (optional)
- `avatar_url` (TEXT) - URL to user avatar (optional)
- `created_at` (TIMESTAMP) - When profile was created
- `updated_at` (TIMESTAMP) - When profile was last updated

#### `user_settings`
Stores user-specific settings including their Gemini API key.
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to auth.users (unique)
- `gemini_api_key` (TEXT) - User's personal Gemini API key
- `preferences` (JSONB) - Other user preferences
- `created_at` (TIMESTAMP) - When settings were created
- `updated_at` (TIMESTAMP) - When settings were last updated

## Row Level Security (RLS)

All tables have RLS enabled to ensure data isolation:

- **Users can only view, insert, update, and delete their own data**
- Authentication is required for all operations
- The `user_id` field in each table links to `auth.users` and is used by RLS policies

## Automatic Triggers

The migrations set up several automatic triggers:

1. **Profile Creation**: When a new user signs up, a profile record is automatically created
2. **Settings Initialization**: When a new user signs up, a settings record is automatically created
3. **Updated At**: The `updated_at` field is automatically updated when records are modified

## Testing the Setup

After applying all migrations, you can test the setup:

1. **Test Authentication**
   ```sql
   -- Should return current user ID
   SELECT auth.uid();
   ```

2. **Test RLS Policies**
   ```sql
   -- Try to insert a receipt (should work if authenticated)
   INSERT INTO receipts (user_id, date, total, merchant)
   VALUES (auth.uid(), '2024-01-15', 25.50, 'Test Store');
   
   -- Try to view receipts (should only see your own)
   SELECT * FROM receipts;
   ```

3. **Test Settings**
   ```sql
   -- Update your Gemini API key
   INSERT INTO user_settings (user_id, gemini_api_key)
   VALUES (auth.uid(), 'your-test-api-key')
   ON CONFLICT (user_id) 
   DO UPDATE SET gemini_api_key = EXCLUDED.gemini_api_key;
   ```

## Environment Variables

After setting up Supabase, update your application's environment variables:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key'
  }
};
```

You can find these values in:
- **Supabase Dashboard** > **Settings** > **API**

## Troubleshooting

### "permission denied" errors
- Verify RLS policies are correctly set up
- Ensure you're authenticated when making queries
- Check that `user_id` matches the authenticated user

### "relation does not exist" errors
- Ensure migrations were run in the correct order
- Check the SQL Editor output for any errors during migration

### "foreign key constraint" errors
- Ensure the `auth.users` table exists
- Verify user authentication is working

## Rollback

If you need to undo migrations, you can drop the tables:

```sql
-- Drop in reverse order to handle dependencies
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
```

**Warning**: This will delete all data! Only do this in development.

## Next Steps

After successfully applying all migrations:

1. Test authentication in your application
2. Configure the Gemini API key in the settings page
3. Try capturing and saving a receipt
4. Verify RLS policies by testing with multiple users

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
