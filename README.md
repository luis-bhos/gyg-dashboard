# GYG Link Dashboard

Deep link manager for GetYourGuide affiliate links with analytics.

## Setup (15 minutes)

### 1. Supabase (database)

1. Go to supabase.com → New Project
2. Once created, go to **SQL Editor**
3. Paste the contents of `supabase-setup.sql` and run it
4. Go to **Project Settings → API** and copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_KEY`

### 2. Vercel (hosting)

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import from GitHub
3. Go to **Project Settings → Environment Variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
4. Redeploy

### 3. Done

- Dashboard: `your-project.vercel.app`
- Links: `your-project.vercel.app/r/SLUG`

## How it works

1. Create a link in the dashboard with a GYG destination URL
2. Get a short link like `your-project.vercel.app/r/abc123`
3. Give that link to your publisher
4. When a user clicks it:
   - Android → opens GYG app via Intent (fallback to web)
   - iOS → tries GYG app scheme (fallback to web after 1.5s)
   - Desktop → goes straight to web
5. Every click is tracked with device type and app/web outcome
