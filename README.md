# Support Us backend

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
