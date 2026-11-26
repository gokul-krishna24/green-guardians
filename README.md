# Green Guardians - Community Environmental Transparency Dashboard

CSR initiative by ABC Manufacturing Ltd. Static site + one Vercel serverless function (`/api/tickets`) for real-time, spam-protected community tickets.

## Deploy to Vercel (real-time mode)

1. Push this folder to a GitHub repo.
2. vercel.com → **Add New → Project** → import the repo → **Deploy** (no build settings needed).
3. In the project: **Storage → Create / Connect → Upstash for Redis** (free tier) → connect to the project.
   This auto-adds `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
4. **Deployments → Redeploy** so the env vars load.

The ticket feed footer shows **"Live · synced across devices"** when storage is connected; otherwise it falls back to **"Demo mode · this device only"**.

## Anti-spam (enforced server-side)
- Required real name (letters only, 2-40 chars), 15-300 char description, min 3 words
- Hidden honeypot field + minimum 4 s form-fill time (bots)
- 1 report / minute and 5 / day per IP; global cap 40 / 10 min
- Duplicate report blocked for 1 hour
- Links, emails, @handles, ALL-CAPS, repeated characters and abusive words (English + Malayalam) rejected
- All output HTML-escaped (no script injection)

## Reset tickets
In the Upstash console run: `DEL gg:tickets gg:seq`
