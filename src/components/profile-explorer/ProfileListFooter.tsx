import { copy } from "@/lib/copy";
import type { ProfileResult } from "@/types/tiktok-profile";

export function ProfileListFooter({ result, loading, error, onMore }: { result: ProfileResult; loading: boolean; error?: string; onMore: () => void }) {
  if (result.section !== "followers" && result.section !== "following") return <p className="profile-explorer__note">{copy.profile.limited}</p>;
  const total = result.profile?.[result.section];
  const loaded = result.items.length;
  const capped = (result.limit ?? 12) >= 240;
  const more = result.limited && !capped && (total === undefined || loaded < total);
  return <div className="profile-explorer__list-footer">
    <p className="profile-explorer__note" role="status">{copy.profile.loadedAccounts(loaded, total)}</p>
    {more && <button type="button" className="profile-explorer__action" disabled={loading} onClick={onMore}>{loading ? copy.profile.loadingMore : copy.profile.viewMore}</button>}
    {error && <p className="profile-explorer__note" role="alert">{error}</p>}
    {!more && total !== undefined && loaded < total && <p className="profile-explorer__note">{capped ? copy.profile.accountLimit : copy.profile.partialAccounts}</p>}
  </div>;
}
