# Supabase setup

Apply the migration in `supabase/migrations/202606290001_initial_sample_os_schema.sql` to a Supabase project.

Recommended order:

1. Create or choose a Supabase project.
2. Run the migration in the SQL Editor, or with the Supabase CLI.
3. Add real users through Supabase Auth.
4. Insert one `organizations` row and matching `profiles` rows for authenticated users.
5. Keep media files in S3 and write only metadata rows to `sample_media`.

The migration enables RLS on public tables and grants access to `authenticated` only. Anonymous users cannot read or write the operational data.

