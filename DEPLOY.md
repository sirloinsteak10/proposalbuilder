# Deployment notes

Stack: Next.js 16 (App Router), Prisma 7 + PostgreSQL, TanStack Query 5, React Hook Form + Zod.

This app builds event proposals for **Oshom Bali** (wedding packages, venue buyouts, corkage, entertainment). Source rate cards live in `docs/oshom/`.

## Live deployment

| Item | Value |
| --- | --- |
| Suggested URL | https://proposal.oshombali.com (or your chosen host) |
| Server folder | `/var/www/proposal-builder` |
| Port | **36899** (bound behind Nginx on `127.0.0.1`) |
| PM2 process | `oshom-proposal-builder` (saved with `pm2 save`) |
| Database | `proposal_builder` on the local PostgreSQL (user `postgres`) |
| Chrome | set `CHROME_PATH` to the Chrome/Chromium binary; `CHROME_NO_SANDBOX=1` when the app runs as root |

Published private/team apps use Cursor sign-in (no email/password). Viewers are mapped to app users on first visit. Locally, a simulated Cursor viewer is used automatically.

## Updating the live app

1. Upload the new source (everything except `node_modules`, `.next`, `.env`, `acc.md`, `src/generated`) into `/var/www/proposal-builder`.
2. `npm install`
3. `npm audit --omit=dev`
4. `npx prisma migrate deploy`
5. `npm run build` (runs `prisma generate`, then `next build`)
6. Permissions: directories 755, files 644, `.env` 600.
7. `pm2 restart oshom-proposal-builder` (never delete the process).

## First-time setup on a new server

1. Pick a random unused port: check `ss -ltn`, the Nginx upstreams and the PM2 app configs. Set it in `.env` (`PORT`), `package.json` scripts and `ecosystem.config.cjs`.
2. Install a Chrome or Chromium binary and set `CHROME_PATH`.
3. `createdb proposal_builder`, then create `.env` from `.env.example` (never commit it). Generate secrets with
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
4. `npm install`, `npm audit --omit=dev`, `npx prisma migrate deploy`.
5. `npx prisma generate` and then `npx prisma db seed`. The seed imports the generated client, so generate must come first. It creates Oshom venues and default proposal texts (no password users).
6. `npm run build`, set permissions, `pm2 start ecosystem.config.cjs`, `pm2 save`.
7. Add the Nginx server block below, run `nginx -t`, reload, then `certbot --nginx -d <domain> --redirect`.

## Nginx

Specific server block, never `default_server`. The `X-Forwarded-For` header is overwritten with the real client address (not appended), because the login rate limit trusts it.

```nginx
server {
    server_name proposal.oshombali.com;

    client_max_body_size 1m;
    server_tokens off;
    proxy_hide_header X-Powered-By;

    # Optional: visitor IP when proxied through Cloudflare
    real_ip_header CF-Connecting-IP;

    location / {
        proxy_pass http://127.0.0.1:36899;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        proxy_read_timeout 90s;           # PDF export can take a few seconds
    }

    listen 80;
}
```

The app sets all security headers itself (CSP, HSTS, frame, nosniff, referrer, permissions), so Nginx does not add them. Session cookies are `Secure`, so the app only works over HTTPS.

## Notes

- Login rate limit: 5 failed attempts per email and 20 per IP in 15 minutes, stored in the `LoginAttempt` table.
- Venues: The Lawn, Oshom Ocean Lounge, Full Venue Buyout (seeded). Add more rows in `Venue` as needed.
- Default PICs, payment terms and T&C for new proposals live in the `Setting` row with key `defaults` (Oshom corkage, cancellation, buyout payment rules).
- Wedding package and entertainment catalogs ship in `src/lib/catalogs.ts` for one-click insert in the editor.
- Tax & service is **21%** (10% PPN + 11% service), matching Oshom buyout / wedding package documents.
- PDF export renders `/print/[id]` in headless Chrome using a signed 90 second token, and the page only loads resources from the app itself.
- `acc.md` contains a plaintext credential. It is git-ignored; delete it and rotate that password once you no longer need it.
