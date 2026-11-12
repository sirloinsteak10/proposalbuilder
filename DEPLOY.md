# Deployment notes

Stack: Next.js 16 (App Router), Prisma 7 + PostgreSQL, TanStack Query 5, React Hook Form + Zod.

## Live deployment

| Item | Value |
| --- | --- |
| URL | https://proposal.lunabeachclubbali.com |
| Server | work VPS `root@31.97.66.253` |
| Folder | `/var/www/proposal-builder` |
| Port | **36899** (bound behind Nginx on `127.0.0.1`). Verified unused on this VPS: not listening, not in any Nginx upstream, not in any PM2 app config. |
| PM2 process | `luna-proposal-builder` (saved with `pm2 save`) |
| Database | `proposal_builder` on the local PostgreSQL (user `postgres`) |
| Nginx | `/etc/nginx/sites-available/proposal.lunabeachclubbali.com`, enabled in `sites-enabled`, no `default_server` |
| TLS | certbot certificate `proposal.lunabeachclubbali.com`, auto-renewing (expires 2027-02-09 at first issue) |
| Chrome | `/usr/bin/google-chrome` (used for PDF export), `CHROME_NO_SANDBOX=1` because the app runs as root |

Sign in at https://proposal.lunabeachclubbali.com/login (opening the site root redirects there) with `events@lunabeachclubbali.com`. The password was changed on the live database to a value chosen by the owner; the same value is kept in the server `.env` as `ADMIN_PASSWORD`, which only the seed script reads. To change it again, update the `User.passwordHash` with a bcrypt (cost 12) hash.

## Updating the live app

1. Upload the new source (everything except `node_modules`, `.next`, `.env`, `acc.md`, `src/generated`) into `/var/www/proposal-builder`.
2. `npm install`
3. `npm audit --omit=dev`
4. `npx prisma migrate deploy`
5. `npm run build` (runs `prisma generate`, then `next build`)
6. Permissions: directories 755, files 644, `.env` 600.
7. `pm2 restart luna-proposal-builder` (never delete the process).

## First-time setup on a new server

1. Pick a random unused port: check `ss -ltn`, the Nginx upstreams and the PM2 app configs. Set it in `.env` (`PORT`), `package.json` scripts and `ecosystem.config.cjs`.
2. Install a Chrome or Chromium binary and set `CHROME_PATH`.
3. `createdb proposal_builder`, then create `.env` from `.env.example` (never commit it). Generate secrets with
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
4. `npm install`, `npm audit --omit=dev`, `npx prisma migrate deploy`.
5. `npx prisma generate` and then `npx prisma db seed`. The seed imports the generated client, so generate must come first. It creates the venue, the default texts and the admin user from `ADMIN_*`.
6. `npm run build`, set permissions, `pm2 start ecosystem.config.cjs`, `pm2 save`.
7. Add the Nginx server block below, run `nginx -t`, reload, then `certbot --nginx -d <domain> --redirect`.

## Nginx

Specific server block, never `default_server`. The `X-Forwarded-For` header is overwritten with the real client address (not appended), because the login rate limit trusts it.

```nginx
server {
    server_name proposal.lunabeachclubbali.com;

    client_max_body_size 1m;
    server_tokens off;
    proxy_hide_header X-Powered-By;

    # Optional: visitor IP when proxied through Cloudflare (set_real_ip_from ranges omitted here,
    # see the live file)
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
- Adding venues: insert rows into the `Venue` table (key, name, tagline, description, seated, standing, features, suitableFor, imageUrl, sortOrder, active). They appear in the editor's venue list.
- Default PICs, payment terms and T&C for new proposals live in the `Setting` row with key `defaults`.
- PDF export renders `/print/[id]` in headless Chrome using a signed 90 second token, and the page only loads resources from the app itself.
- `acc.md` contains a plaintext credential. It is git-ignored; delete it and rotate that password once you no longer need it.
