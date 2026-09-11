# KonbiniAPI Story contract

Active provider: KonbiniAPI. No fallback to Apify or TikHub.
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

Playback uses opaque /api/tiktok/media identifiers stored for 15 minutes. Media URLs
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

If TikTok blocks a feed media URL, playback lazily resolves /videos/{id}/download through KonbiniAPI. This costs one additional request for a watched video, cached/coalesced for five minutes; failures are cached too. Unwatched videos do not trigger this request. A production check confirmed a 206 MP4 response from the download URL.
