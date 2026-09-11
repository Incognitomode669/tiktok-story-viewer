# Storyroom · TikTok Story Viewer

**Status: the Apify connection is active.** A real lookup of `ewwzel` returned an empty
dataset, which now produces HTTP 200 and the no-active-Story state. Video normalization
uses the Actor's documented fields and has fixture tests; live video output/playback
still needs verification with an account for which the provider returns a Story.
See [provider verification details](docs/provider-contract.md).

## Official installation

Created using the official Next.js installer, not a handwritten framework scaffold:

```sh
npx create-next-app@latest tiktok-story --typescript --eslint --app --src-dir --no-tailwind --no-react-compiler --use-npm --import-alias "@/*" --yes --disable-git
```

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [create-next-app CLI](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
- Next.js 16.3.4, React 19.2.8, TypeScript strict mode, App Router.
- Use **Node.js 24 LTS** from [nodejs.org](https://nodejs.org/en/download). Open a new
  terminal after installing and check `node --version`. The original machine's Node
  22.12 is below the supported version for the installed test/tooling dependencies.
- npm lockfile included. No forced or legacy-peer-dependency installation was used.
- Repository ownership rules prohibit Tailwind. Styling is plain BEM CSS. A small
  PostCSS plugin compiles tokens from `src/app/globals.css`'s `@theme` block to `:root`.
  All application copy is in `src/lib/copy.ts`.

The application is in the **tiktok-story** subfolder of the supplied workspace.

## Get the only required key: APIFY_TOKEN

1. Create an account or sign in at [Apify](https://console.apify.com/).
2. Open [Settings → API & Integrations](https://console.apify.com/settings/integrations).
3. Create a personal API token named for this project. Use a separate token for this
   application. Where scoped permissions are available, allow this Actor to run and
   its resulting dataset to be read; choose only the required permissions.
4. Open [powerai/tiktok-user-story-scraper](https://apify.com/powerai/tiktok-user-story-scraper).
   Review its current pricing and available account credits. Actor calls can incur
   charges even when a browser request times out. Do not configure automatic retries.
5. In this application folder, copy `.env.example` to `.env.local` if the latter does
   not already exist. An empty `.env.local` was prepared during setup.
6. Put the token after the equals sign:

```dotenv
APIFY_TOKEN=your_actual_apify_token
```

7. Save the file and restart the dev server. Never paste a token into chat, commit it,
   place it in a URL, or name it `NEXT_PUBLIC_APIFY_TOKEN`. Only server code reads it.

[Apify's authentication guide](https://docs.apify.com/integrations/api) documents token
creation and Bearer-header authentication. No TikTok API key, password, session cookie,
database key, OpenAI key or OAuth application is needed for the specified integration.

## Optional provider inspection

Normal searches now call Apify directly through the server. To inspect the raw output
for a public username with an active Story, run this from the application directory:

```sh
npm run provider:inspect -- public_username
```

This command makes a real, potentially billable Actor call and writes its dataset to
`.local/apify-response.json`. The file is ignored by Git. Inspect it locally to verify
non-empty media fields and adapt the normalizer if the live schema differs.
No secrets are printed. Delete inspection data when no longer needed; media links expire.

The published Actor example alone does not establish an image schema, avatar field,
creation timestamp, expiry timestamp, or distinct private/not-found errors. The UI
can render image or video Stories through the internal types, but provider mapping
for these fields must be confirmed. Missing avatars should use the initials fallback.
Do not treat `scrapedAt` as creation time, or ordinary videos as active Stories.

## Run locally

In PowerShell, from the supplied workspace:

```powershell
cd tiktok-story
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). For a reproducible clean dependency
installation, use `npm ci` instead of `npm install`.

```sh
npm run lint
npm test
npm run test:e2e
npm run build
npm start
```

Browser tests use installed Google Chrome. They check desktop, tablet and mobile
  rendering, loading/errors, generated-video playback, image timing, pause/replay and keyboard navigation. Fixtures
are injected only by tests, never by the application. They do not prove real TikTok
CDN playback. Screenshots are saved under `.local/`.

## Application API

```sh
curl "http://localhost:3000/api/tiktok/story?username=public_username"
```

On Windows PowerShell, `curl.exe` can be used to avoid older PowerShell's curl alias.

Target normalized success shape (illustrative, **not a captured live result**):

```json
{
  "success": true,
  "username": "public_username",
  "hasStory": true,
  "stories": [{
    "id": "provider-story-id",
    "type": "video",
    "videoUrl": "https://cdn.example.com/temporary-video.mp4",
    "duration": 10,
    "author": { "username": "public_username", "displayName": "Display name" }
  }]
}
```

No-story contract (only when verified provider output establishes no available content):

```json
{ "success": true, "username": "public_username", "hasStory": false, "stories": [] }
```

Current response before configuring the token (HTTP 503):

```json
{
  "success": false,
  "error": {
    "code": "NOT_CONFIGURED",
    "message": "The Story service is not configured yet. The site owner needs to add the Apify token."
  }
}
```

Configured lookups now call Apify; the previous `PROVIDER_UNVERIFIED` gate is removed.
Invalid input returns HTTP 400 / `INVALID_USERNAME`.
Timeouts map to 504 / `TIMEOUT`; throttling maps to 429 / `RATE_LIMITED` with Retry-After.
Upstream details and credentials are never returned. Do not map an Apify Actor 404
to a TikTok account-not-found error.

## Structure

```text
src/
  app/
    api/tiktok/story/route.ts
    error.tsx
    globals.css
    icon.svg
    layout.tsx
    page.tsx
  components/
    tiktok-story-search/
      TikTokStorySearch.tsx
      useStorySearch.ts
      tiktokStorySearch.css
    story-viewer/
      StoryViewer.tsx
      StoryMedia.tsx
      useStoryPlayback.ts
      storyViewer.css
    story-progress/
      StoryProgress.tsx
      storyProgress.css
    user-profile/
      UserProfile.tsx
      userProfile.css
    story-state/
      StoryState.tsx
      storyState.css
  lib/
    api.ts
    copy.ts
    env.ts
    rate-limit.ts
    username.ts
  services/tiktok/
    story-provider.ts
    apify-client.ts
    apify-story-provider.ts
    normalize-apify-stories.ts
    story-service.ts
  types/tiktok-story.ts
scripts/
  inspect-provider.mjs
  theme-tokens.cjs
docs/provider-contract.md
tests/
  unit/server.test.ts
  unit/normalizer.test.ts
  e2e/viewer.spec.ts
.env.example
.nvmrc
AGENTS.md
eslint.config.mjs
next-env.d.ts
next.config.ts
package.json
package-lock.json
playwright.config.ts
postcss.config.mjs
tsconfig.json
vitest.config.mts
```

## Operational boundaries

- Only public, authorized content; no login/cookie collection or privacy bypass.
- The provider-neutral interface isolates the UI from Apify's raw schema.
- Request budget: 10 valid lookups/minute per process; no untrusted forwarded IP header.
  Before public deployment, add a durable per-client limiter at a trusted gateway.
  Multiple instances do not share the included in-memory limit or cache.
- Cache: at most 100 accounts, 60 seconds, bounded by known expiry if present;
  concurrent identical lookups coalesce. Provider HTTP requests and browser API
  responses use `no-store`. There is no database or permanent media archive.
- Transport timeout: 60 seconds with an Actor runtime budget of 55 seconds. The host
  needs a request duration of at least 65 seconds; shorter serverless limits require
  an asynchronous job flow before deployment. Client disconnection does not guarantee
  cancellation of an already-started Actor.
- No public deployment has been performed. Verify non-empty live output, provider
  errors, CDN playback and durable abuse controls before production release.
- No protected parent repository or existing business-logic files were modified.
