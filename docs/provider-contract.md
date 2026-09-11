# Provider contract and verification

## Retrieval investigation: September 11, 2026

The user confirmed that `ewwzel` had a public Story. Inspection of run
`qaOjjfv74mveyuEoQ` revealed that Apify had injected the Actor's example
`user_id` (`7128593328456041478`) alongside our `unique_id`. Both application
and inspection requests now send `user_id: ""` explicitly to prevent that default.
Its effect on retrieval is not yet established.

The corrected run `mzYimo9F93EzPDsSn` confirmed the intended input, but its log said
"Free user call limit reached" and requested a paying user. It nevertheless reported
`SUCCEEDED` and returned `[]`. Therefore an empty dataset from this Actor cannot be
treated as proof that a public Story does not exist. The empty-state copy now says
"No Stories returned" and explains provider access/usage limitations.

The synchronous dataset endpoint does not expose this log-only refusal in its JSON.
Automatic quota classification is not implemented; avoid inferring it from all empty
responses. A future change could track each exact run ID and inspect its log before
classifying an empty dataset. Further live verification requires restoring Actor access
or selecting a different authorized provider. Do not retry repeatedly against this limit.

The former `PROVIDER_UNVERIFIED` placeholder caused every configured lookup to return
503. It is removed. The adapter calls the server-only transport and normalizer.

## Actual evidence

On September 11, 2026, an authenticated Actor run for `ewwzel` succeeded and returned
`[]`. Its output was inspected locally before implementing the normalizer. The app
endpoint now returns HTTP 200:

```json
{"success":true,"username":"ewwzel","hasStory":false,"stories":[]}
```

This means the provider returned no available Stories. It does not establish whether
the account exists, is private, has expired content, or has Stories that the provider
cannot access. The UI deliberately preserves that uncertainty.

## Documented video contract

Primary sources:
- https://apify.com/powerai/tiktok-user-story-scraper
- https://apify.com/powerai/tiktok-user-story-scraper/input-schema
- https://docs.apify.com/api/v2

`normalizeApifyStories` maps the published `aweme_id`/`video_id`, `play`/`wmplay`,
`cover`, `duration`, `author.unique_id`, and `author.nickname` fields. Test fixtures
for this non-empty shape are documentation-derived, not captured live video results.
Unknown shapes fail explicitly. Missing/unsafe playback URLs return `MEDIA_UNAVAILABLE`.
Only HTTPS URLs on recognized TikTok CDN domains pass; the server does not proxy media.
The author must match the requested username. Duplicate Story IDs are removed.

The published format does not establish an image schema, creation timestamp,
expiry timestamp, or distinct private/not-found response shapes. These are not invented.
`scrapedAt` is not a creation time. Covers are not substituted for missing videos.
The provider-neutral UI supports images, but this Actor's image mapping is not enabled.

On September 11, 2026, a read-only inspection of the latest successful Actor dataset
for `ddylaar` confirmed `author.avatar` as a direct HTTPS URL on
`p19-common-sign.tiktokcdn-eu.com`. The normalizer now maps this optional field through
the existing CDN URL validator. Missing or invalid avatars are omitted so the UI retains
its initial fallback. No additional Actor run or profile lookup is required.

`play_count` is mapped to optional `views` when it is a non-negative safe integer.
A read-only inspection of the latest successful `ddylaar` dataset confirmed numeric
counts of 18, 8, and 8. These are provider-reported play/view counts at retrieval time,
not a list of viewers or a claim of unique viewers. Missing/invalid counts stay hidden;
an explicit zero is displayed. The existing one-minute Story cache still applies.

## Remaining live verification

Use an account for which the provider returns a non-empty dataset. Optionally run
`npm run provider:inspect -- username` (billable Actor usage), inspect the ignored
`.local/apify-response.json`, and verify browser playback before production release.
Update mappings and add sanitized live fixtures if the response differs. An upstream
404 is a provider error, not proof that a TikTok account was not found.

The inspection script uses the CommonJS-compatible default import for `@next/env`.
Credentials and raw upstream errors are not printed. Temporary signed media links must
not be committed or stored permanently. Only the one-minute in-memory cache is used by
normal application requests.

Public deployment also needs a durable per-client rate limiter or gateway policy.
The included per-process request budget and cache are local safeguards.
