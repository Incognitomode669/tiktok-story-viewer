# KonbiniAPI profile sections

KonbiniAPI is the sole active provider. `KONBINI_API_KEY` is required; old Apify and
TikHub environment variables are ignored. API documentation:
https://docs.konbiniapi.com/reference/api/tiktok

- Profile: `/v1/tiktok/users/{username}` maps Person fields to profile name, avatar,
  bio and counts. `likeCount` is total likes; `mediaCount` is posts.
- Posts: `/users/{username}/videos`.
- Reposts: `/users/{username}/reposts`; preserve original creator, never replace
  the searched account's summary with that creator's counts.
- Followers/Following: corresponding `/followers` and `/following` endpoints.
- Collections: `/users/{username}/collections`, then `/collections/{collectionId}`.
  These are playlists/mixes, not Story Highlights. The old internal `highlights`
  section and `highlightId` request field are retained for compatibility, but all
  visible labels and provider endpoints refer to Collections. Collection IDs must
  first appear in that account's cached collection list.

Profile lists use OrderedCollectionPage `orderedItems` and `nextCursor`, validate
`partOf`, deduplicate IDs, and map only safe public fields. Existing embedded playback
remains available for photo posts; video attachments play through the media stream.

Five-minute profile/page caches hold at most 100 entries each. Followers/Following
fetch up to 30 accounts per page. View more reuses buffered entries and fetches the
next cursor as needed, capped at 240 displayed accounts and 12 provider pages per
request. Repeated cursors/no progress stop additional requests. Failed expansions
preserve earlier cached pages. There are at most two in-flight profile section
lookups. All requests share a 55-second deadline and never retry automatically.

Live verification September 12, 2026: profile, reposts, followers, following, posts,
collection listing and collection posts returned usable data. TikTok's account
returned five collections; the first collection returned three posts. Story checks
returned no items, so active Story playback remains unverified.
