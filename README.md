# Support Us backend

## Deploying to Vercel

Set the Vercel project's Root Directory to `backend`. The Express app is exported
from `src/index.ts`, which Vercel serves as a function. Keep the Build Command
as `npm run build` and leave the Output Directory empty.

The local `.env` file is not uploaded to Vercel. Add these variables in the
Vercel project's Environment Variables settings for each environment you deploy:

- `DATABASE_URL`
- `FRONTEND_ORIGIN` — the exact deployed frontend origin, including `https://`
- `CASHFREE_ENV` — `sandbox` or `production`
- `CASHFREE_APP_ID`
- `CASHFREE_SECRET_KEY`
- `DONATION_RETURN_URL` — the deployed frontend URL Cashfree should return to

`CASHFREE_API_VERSION` and `ADMIN_API_KEY` are optional. Redeploy after adding or
changing variables, then verify the backend at `/api/health`.

## Donation recipients

Configure the active recipients in `src/seed.ts`, then run this from the backend directory:

```bash
npm run db:seed
```

The seed command creates or updates the three default recipients and deactivates the previous defaults. Admins can add, edit, and deactivate recipients at `/admin`; active recipients are shown on the public donation form.

## Admin access

The admin API returns donor contact details and must be protected by a private key. Generate a key locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set the generated value as `ADMIN_API_KEY` in the backend `.env` file or the backend hosting provider's secret environment variables. Keep it private, do not add it to the frontend environment, and restart/redeploy the backend after setting it. The admin page is available at `/admin` and stores the entered key only for the current browser session.

fix error 