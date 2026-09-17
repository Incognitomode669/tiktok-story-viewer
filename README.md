# Storyroom

Storyroom uses **KonbiniAPI only** for profile details, Stories, Posts, Reposts,
Collections, Followers, and Following. No alternate providers are configured. Existing playback gestures and shared Story volume remain intact.

## Run locally

Use Node.js 24, then run from the `tiktok-story` directory:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For production, use `npm run build` then `npm start`.
Restart the server after changing environment variables.

## Required API key

1. Sign up at https://app.konbiniapi.com/ and choose a plan.
2. Generate an API key in the dashboard.
3. Set `KONBINI_API_KEY=your_key` in `.env.local` (copy `.env.example` only if the file
   does not already exist). Keep it server-only; do not use `NEXT_PUBLIC_`.
4. Restart the server. Only KONBINI_API_KEY is used.

Konbini's free allowance is one-time, not recurring. Check current pricing at
https://konbiniapi.com/pricing. The application does not buy credits, change plans,
or retry failed provider requests automatically.

## Installation provenance

Originally scaffolded with the official Next.js installer:

```sh
npx create-next-app@latest tiktok-story --typescript --eslint --app --src-dir --no-tailwind --no-react-compiler --use-npm --import-alias "@/*" --yes --disable-git
```

Next.js 16.3.4, React 19.2.8, TypeScript, App Router. Dependencies are recorded in
`package-lock.json`. This provider migration required no new dependencies or scaffold.
Styling is plain CSS; copy lives in `src/lib/copy.ts`.

## Verification

`npm test`, `npm run lint`, and `npm run build` validate the application.
`npm run provider:inspect -- username` makes a real Konbini Story request and may use
credits; it prints only status/counts, never the key or raw response.

See `docs/provider-contract.md` and `docs/profile-providers.md` for response mapping,
pagination, caching and current live-test limitations.

### TikTok LIVE

Search a username, select **Live**, then press play when a broadcast is available. The player provides volume and fullscreen controls. **Refresh** checks status again; checks are cached for 30 seconds and never polled automatically. Viewer count is a snapshot at the displayed check time.

Uses Konbini's documented user live endpoint and mpegts.js for FLV playback. Other stream formats are reported as unsupported. Stream URLs are kept server-side behind temporary opaque handles; the proxy forwards no API credentials. Leaving the tab destroys the player and cancels its stream. A persistent Node server is recommended: hosting platforms that limit response duration can interrupt long broadcasts.

Documentation: https://docs.konbiniapi.com/reference/api/tiktok/get-user-live-stream and https://github.com/xqq/mpegts.js

Validation: production build, lint, 21 unit tests, and browser checks for real offline status, stream failure, and player cleanup passed. Konbini reported ewwzel offline during verification; actual live broadcast decoding remains unverified.
