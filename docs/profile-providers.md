# Profile sections

The existing Stories provider is unchanged. After submitting a username, the profile
explorer below the player loads additional sections only when selected. The existing
server-only `APIFY_TOKEN` is reused; no new key or dependency is required.

## Sources and contracts

- Posts/reposts and profile counts: https://apify.com/clockworks/tiktok-scraper
  (`profiles`, `profileScrapeSections`, `resultsPerPage`; output `authorMeta`,
  `videoMeta.coverUrl`, `webVideoUrl`, `input`, `fromProfileSection`).
- Follower/following samples: https://apify.com/clockworks/tiktok-followers-scraper
  (`profiles`, `maxFollowersPerProfile`, `maxFollowingPerProfile`; output
  `authorMeta`, `connectedTo`, `connectionType`).
- Experimental highlights: https://apify.com/igview-owner/tiktok-highlight-scraper
  (`highlight_list` then `highlight_posts`; `uniqueIds`, `highlightIds`, `postsPerPage`).
- API: https://docs.apify.com/api/v2/actor-run-sync-get-dataset-items-post

Free-tier pricing checked September 11, 2026 via public Actor metadata: Clockworks
posts $0.0037/result plus $0.001/start; followers $0.001/result plus $0.001/start;
highlights $0.02/result plus startup/platform usage. Rates depend on the Apify plan
and may change. Confirm on the Actor pricing pages before heavier use. No paid plan
is purchased by this app; a token must have access and sufficient credit.

Each new run sends `maxTotalChargeUsd=0.5`, `timeout=55`, and `limit=12`.
Clockworks requests 12 results and disables download/filter/comment add-ons.
Highlights' `postsPerPage` is a pagination size, not a total scrape cap; its run
budget and timeout bound collection work. Only 12 returned rows are displayed.
Results cache for five minutes per process, concurrent identical requests coalesce,
and at most two profile runs may execute together. The existing process lookup
budget is also applied. This is a local-use design, not a durable public quota system.

Missing counts remain unknown, not zero. Repost creators' counts never substitute
for the searched user's counts. Provider errors are not represented as empty lists.
Empty responses explicitly leave availability uncertain. Posts and reposts use the
official inline TikTok player (`https://www.tiktok.com/player/v1/{id}`) when Watch
here is selected. See https://developers.tiktok.com/docs/en/embed-player. Downloads
are not enabled. Playback still depends on TikTok allowing the embed for that post.
Highlights play direct CDN videos or show photos. Only one profile card player is
mounted at a time, and closing it or switching sections stops that playback.
To access a highlight's posts its collection must belong to the searched username
in the recent server cache. Reload collections if the cache has expired.

Unit and browser fixtures are synthetic examples based on the above contracts.
Live retrieval depends on the provider; an installed integration is not a guarantee
that every account exposes every section.

A live Posts lookup for `ddylaar` returned `authorMeta` and the note
`Profile has no videos (or is behind a login wall)`, with no post ID. That observed
shape now preserves profile counts and returns an empty content list. The other
sections have contract-based tests but have not been live-verified on this account.

## Expanding account lists

Followers and Following start at 12 accounts. View more increases the requested
limit by 12 (maximum 240), reusing cached results when possible. This provider's
input contract has no continuation cursor: each larger uncached lookup reruns the
scrape and can charge for earlier results again. The $0.50 per-run cap remains.
The UI preserves existing rows if expansion fails, deduplicates by account ID,
shows loaded versus reported total, and stops offering more when the provider
returns fewer rows than requested or the reported total/lookup cap is reached.
Profile totals do not guarantee that every account can be retrieved.

On September 12, 2026, saved repost datasets for `ewwzel` included creator
`.peasy`. Applying the search-input validator to that provider handle rejected
an otherwise valid list. Provider creator handles now allow leading periods while
retaining the character/length restriction. Search-input validation, requested
profile ownership checks, section checks, and URL validation are unchanged.
