export type SubscriptionTier = 'free' | 'pro';

/** Pro membership: unlocks the ability to release albums and songs (host MP3s on Metalist). */
export const PRO_MONTHLY_PRICE_DOLLARS = 3;
/** Per-track charge when publishing a release with hosted audio. e.g. 5-track EP = $10. */
export const PRICE_PER_TRACK_DOLLARS = 2;

type TierLimits = {
  /** If true, user can upload/host MP3s (subject to pay-per-release at publish time). */
  canHostAudio: boolean;
  /** Human-readable summary for UI. */
  description: string;
};

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    canHostAudio: false,
    description: 'Embed from YouTube / SoundCloud only. Upgrade to Pro to release albums and songs on Metalist.',
  },
  pro: {
    canHostAudio: true,
    description: 'Release albums and songs with hosted MP3s. Pay per release when you publish (e.g. $2 per track).',
  },
};

export type BandAudioUsage = {
  audioStorageBytes: number;
  audioTracksUploadedThisPeriod: number;
};

export type UploadCheckResult = {
  allowed: boolean;
  reason?: string;
};

/**
 * Pro members can upload; payment is collected per release at publish time.
 * Free members cannot host audio.
 */
export function canUploadAudioTrack(tier: SubscriptionTier): UploadCheckResult {
  if (tier === 'free') {
    return {
      allowed: false,
      reason: 'You need a Pro membership to release albums and songs with hosted audio. See Plans.',
    };
  }
  return { allowed: true };
}

/**
 * Cost in dollars for a release with the given number of hosted tracks.
 * Pro only; free cannot host.
 */
export function releaseCostDollars(trackCount: number): number {
  return trackCount * PRICE_PER_TRACK_DOLLARS;
}
