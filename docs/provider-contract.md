# KonbiniAPI Story contract

Active provider: KonbiniAPI. KonbiniAPI is the sole provider.
Docs: https://docs.konbiniapi.com/reference/api/tiktok/get-user-stories
Authentication: Bearer `KONBINI_API_KEY`, server-only.

The profile request validates identity and public visibility. Story requests use
`GET /v1/tiktok/users/{username}/stories?count=30`, reading `data.orderedItems` and
`nextCursor`, with a maximum of three pages and 20 displayed Stories.
`partOf` must match the requested account and endpoint. Provider pagination URLs are
never fetched directly. Empty lists are successful empty responses, not proof that
TikTok has no Story. Errors and exhausted credits remain errors.

Map `entityId`, `attributedTo`, `published`, `endTime`, `duration`, `viewCount`,
`preview`, `attachment` and `image`. Videos require a Video attachment; a cover is
never treated as video content. Image Stories use explicit image media. Expired
Stories are discarded. Missing views remain missing; zero remains zero. Provider
viewCount is not independently verified as TikTok's unique-viewer count.

Story results are cached for 60 seconds, bounded by story expiry, with in-flight
requests coalesced. Profile summaries are shared with profile sections for five
minutes. A search ordinarily costs one profile request (unless cached) plus its
Story pages. There are no automatic retries or paid-provider fallbacks.

Playback uses opaque /api/tiktok/media identifiers stored for up to 24 hours. Media URLs
must be HTTPS on allowlisted TikTok media hosts. Byte ranges stream through the
server; cookies from media attachments never enter client responses. Redirects are
validated, and cookies are never forwarded across hosts. HTML/error responses and
upstream Set-Cookie headers are not forwarded. The registry is process-local and
bounded to 3,000 entries; restart invalidates handles. A distributed deployment needs
a shared media registry before running multiple independent application instances.

Live verification September 12, 2026: both ddylaar and ewwzel returned successful,
empty Story collections. Non-empty Story normalization is tested with documented
synthetic video/image fixtures. Actual active Story playback still needs a current
public Story returned by the provider. Profiles and other sections returned live data.




## Documented video playback

Video handles store the numeric entityId. On playback, the server calls
GET /v1/tiktok/videos/{videoId}/download and validates data.type=Video and data.url.
That URL is documented as directly fetchable without cookies/authentication.
The feed attachment URL is never attempted for videos. Images use their supplied
media URL. There is no alternate provider or embedded-player path.

Download lookups are lazy, coalesced per video, and cached for five minutes.
Each uncached watched video uses one additional Konbini credit. Failed lookups
are cached for 30 seconds. A rejected CDN URL becomes eligible for a fresh lookup
on a later retry, limited to once per 30 seconds. There are no automatic retry loops.
Byte ranges are streamed and upstream 416 is preserved. X-Storyroom-Media-Error
provides a safe error code without exposing URLs, credentials or provider bodies.
Registry versioning invalidates old handles after this deployment: search again.

Reference: https://konbiniapi.com/apis/tiktok/video-download-url

When video attachments include an HTTPS www.tiktok.com/aweme/v1/play/ address, the server passes it as the documented url parameter to the download endpoint. This avoids re-fetching video details internally. Other hosts/paths cannot be used for this parameter. Live ewwzel testing confirmed this returned a 206 video/mp4 stream.


Latest production verification: ewwzel returned three active Stories. All three decoded in Chrome at 576x1024 with no media errors; durations were 26.4s, 6.105s and 22.777s. This supersedes the earlier empty-Story test limitation.
