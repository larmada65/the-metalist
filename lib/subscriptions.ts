export type SubscriptionTier = 'free' | 'bedroom' | 'pro' | 'pro_plus';

/** Bedroom Musician: $3/month, 1 demo per week */
export const BEDROOM_MONTHLY_PRICE_DOLLARS = 3;
/** Pro: $5/month, replaces old Pro */
export const PRO_MONTHLY_PRICE_DOLLARS = 5;
/** Pro+: $10/month */
export const PRO_PLUS_MONTHLY_PRICE_DOLLARS = 10;
/** Legacy constant for compatibility */
export const PRO_MONTHLY_PRICE_DOLLARS_LEGACY = 3;
/** Per-track charge when publishing a release with hosted audio. */
export const PRICE_PER_TRACK_DOLLARS = 2;

type TierLimits = {
  canHostAudio: boolean;
  /** Max demos per month. -1 = unlimited. For bedroom: 4 (1/week). */
  demosPerMonth: number;
  /** If true, can add lyrics to tracks. */
  canAddLyrics: boolean;
  /** If true, band page shows merchandise link. */
  canAddMerch: boolean;
  description: string;
};

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    canHostAudio: false,
    demosPerMonth: 1,
    canAddLyrics: false,
    canAddMerch: false,
    description: 'Embed from YouTube / SoundCloud only. 1 demo per month.',
  },
  bedroom: {
    canHostAudio: false,
    demosPerMonth: 4, // 1 per week
    canAddLyrics: false,
    canAddMerch: false,
    description: '1 demo per week. For bedroom musicians and solo artists.',
  },
  pro: {
    canHostAudio: true,
    demosPerMonth: -1,
    canAddLyrics: false,
    canAddMerch: false,
    description: 'Release albums with hosted MP3s. Unlimited demos. Pay per release ($2/track). For bands.',
  },
  pro_plus: {
    canHostAudio: true,
    demosPerMonth: -1,
    canAddLyrics: true,
    canAddMerch: true,
    description: 'Pro + lyrics on tracks, merchandise link on band page, unlimited demos.',
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
 * Pro and Pro+ can upload hosted audio; payment per release at publish time.
 */
export function canUploadAudioTrack(tier: SubscriptionTier): UploadCheckResult {
  if (tier === 'free' || tier === 'bedroom') {
    return {
      allowed: false,
      reason: 'You need Pro or Pro+ to release albums with hosted audio. See Plans.',
    };
  }
  return { allowed: true };
}

/** Pro+ can add lyrics to tracks */
export function canAddLyrics(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_LIMITS[tier].canAddLyrics;
}

/** Pro+ bands can add merchandise link */
export function canAddMerch(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_LIMITS[tier].canAddMerch;
}

/**
 * Cost in dollars for a release with the given number of hosted tracks.
 * Pro only; free cannot host.
 */
export function releaseCostDollars(trackCount: number): number {
  return trackCount * PRICE_PER_TRACK_DOLLARS;
}

/** Max demos per month for a tier. -1 = unlimited. */
export function demosPerMonthLimit(tier: SubscriptionTier): number {
  return SUBSCRIPTION_LIMITS[tier].demosPerMonth;
}

/** Whether the user can upload another demo this month given current count. */
export function canUploadDemo(tier: SubscriptionTier, demosUploadedThisMonth: number): { allowed: boolean; reason?: string } {
  const limit = demosPerMonthLimit(tier)
  if (limit === -1) return { allowed: true }
  if (demosUploadedThisMonth >= limit) {
    const planName = tier === 'free' ? 'Free' : tier === 'bedroom' ? 'Bedroom Musician' : 'your plan'
    return {
      allowed: false,
      reason: `${planName} allows ${limit} demo${limit === 1 ? '' : 's'} per month. Upgrade for more.`,
    }
  }
  return { allowed: true }
}

/** Normalize Stripe tier string to SubscriptionTier */
export function normalizeTier(tier: string | undefined): SubscriptionTier {
  if (!tier || tier === 'free') return 'free'
  if (tier === 'bedroom' || tier === 'bedroom_musician') return 'bedroom'
  if (tier === 'pro_plus' || tier === 'proplus') return 'pro_plus'
  if (['pro', 'creator', 'studio', 'label'].includes(tier)) return 'pro'
  return 'free'
}

/** Tier hierarchy: free < bedroom < pro < pro_plus */
const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  bedroom: 1,
  pro: 2,
  pro_plus: 3,
}

export function tierRank(tier: SubscriptionTier): number {
  return TIER_RANK[tier] ?? 0
}

export function isTierHigherThan(a: SubscriptionTier, b: SubscriptionTier): boolean {
  return tierRank(a) > tierRank(b)
}
