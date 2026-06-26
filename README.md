# atlasz — website

The public marketing landing page for atlasz. A standalone static site (Vite +
React + Tailwind 4) that reuses the dark theme and UI components from the `web/`
app. Visitors answer a short quiz, then subscribe with their name, email and
phone number (with explicit GDPR/privacy consent). Submissions are sent to the
atlasz backend at `POST /api/subscribe`.

## Develop

```bash
npm install
npm run dev          # http://localhost:3001
```

In dev, `/api` is proxied to the backend (default `http://localhost:8080`,
override with `BACKEND_ORIGIN`). Leave `VITE_API_BASE_URL` empty so requests use
the proxy.

## Build

```bash
npm run build        # type-checks then emits static files to dist/
npm run preview      # serve the production build locally
```

## Configuration

| Variable             | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| `VITE_API_BASE_URL`  | Backend origin for `POST /api/subscribe` (empty ⇒ same origin) |
| `BACKEND_ORIGIN`     | Dev-only: where the Vite proxy forwards `/api` (build-time)    |

Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` for production builds.

## Deploy

The build output in `dist/` is fully static.

- **Vercel** — Framework preset: *Vite*, build command `npm run build`, output
  directory `dist`. Set `VITE_API_BASE_URL` in the project environment variables.
- **S3 (static hosting)** — `npm run build`, then upload `dist/` to the bucket
  (e.g. `aws s3 sync dist/ s3://<bucket> --delete`) with static website hosting
  enabled. Set `VITE_API_BASE_URL` before building.

- **Scaleway Object Storage (CI)** — `.github/workflows/deploy-website.yml`
  builds and syncs `dist/` to a Scaleway bucket on every push to `main` that
  changes `website/` (a path filter keeps it from running for backend/, mobile/
  or other changes), or via *Run workflow*. Hashed assets get a long immutable
  cache; `index.html` is served `no-cache`. Configure first:

  | Kind     | Name                 | Purpose                                        |
  | -------- | -------------------- | ---------------------------------------------- |
  | Secret   | `SCW_ACCESS_KEY`     | Scaleway API access key                        |
  | Secret   | `SCW_SECRET_KEY`     | Scaleway API secret key                        |
  | Variable | `SCW_WEBSITE_BUCKET` | Target bucket name                             |
  | Variable | `SCW_REGION`         | Scaleway region (optional, default `fr-par`)   |
  | Variable | `VITE_API_BASE_URL`  | Backend origin baked into the build            |

  The bucket needs static website hosting enabled with `index.html` as the
  index document.

The backend must allow the deployed origin in `ATLASZ_SERVER_ALLOWED_ORIGINS` (CORS).
