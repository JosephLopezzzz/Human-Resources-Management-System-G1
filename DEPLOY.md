# Deploy Edge Function (Fix Create User / Create Admin 401)

If **Create User** or **Create Admin** shows **"Request failed (401)"**, the Supabase **Edge Function gateway** is rejecting the request before it reaches the function. The project is already set up so the function validates the JWT itself; the gateway must have **JWT verification turned OFF** for `admin-create-user`.

Pasting code in the Supabase **Dashboard** does **not** apply `verify_jwt = false` from `supabase/config.toml`. You must deploy the function using the **Supabase CLI** so that setting is used.

---

## Step 1: Install Supabase CLI (if needed)

- **Windows (PowerShell):**  
  `irm get.supabase.io/cli | iex`

- **Or with npm:**  
  `npm install -g supabase`

- **Or with Scoop:**  
  `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git`  
  `scoop install supabase`

Check: run `supabase --version`.

---

## Step 2: Log in and link your project

1. Open a terminal in the project folder:
   ```
   cd "c:\Users\Joseph T Lopez\Downloads\Human Resources Management System G1"
   ```

2. Log in (opens browser):
   ```
   supabase login
   ```

3. Link this folder to your hosted project (use the **project ref** from Dashboard → Project Settings → General):
   ```
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   When prompted, enter your database password if asked.

---

## Step 3: Deploy the function (with JWT verification OFF)

From the same project folder, run:

```
supabase functions deploy admin-create-user
```

The repo’s `supabase/config.toml` already has `verify_jwt = false` for `admin-create-user`, so this deploy will turn off JWT verification at the gateway. The function code still validates the user’s token inside the function.

---

## Step 4: Set secrets (if not already set)

The function needs the project’s **service role key** only as a Supabase secret (usually set automatically for linked projects). If Create User still fails with a server error, in Dashboard go to **Project Settings → Edge Functions → Secrets** and ensure the function has access to the project URL and service role key (Supabase often injects these; if you use custom env vars, set them there).

---

## Step 5: Try again in the app

1. Log out of the app, then log back in (so you have a fresh session).
2. Open **Create Admin** or **Create User**, fill the form, and submit.

If you still see an error, copy the **exact** message (and any “detail” line) and use it to debug (e.g. wrong role in `user_metadata`, or wrong project URL in `.env`).

---

## Summary

| Action | Command / Location |
|--------|---------------------|
| Go to project folder | `cd "c:\Users\Joseph T Lopez\Downloads\Human Resources Management System G1"` |
| Log in | `supabase login` |
| Link project | `supabase link --project-ref YOUR_PROJECT_REF` |
| Deploy function (verify_jwt = false from config) | `supabase functions deploy admin-create-user` |

After this, the gateway will allow the request through and your function will validate the user’s JWT and create the user.
