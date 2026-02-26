export type SubscriptionTier = 'free' | 'creator' | 'studio' | 'label';

type TierLimits = {
  /** Maximum number of new audio tracks a band owner can upload in the current billing period. */
  maxTracksPerMonth: number;
  /** Soft cap on total audio storage across all bands owned by the user (in bytes). */
  maxStorageBytes: number;
  /**
   * How many bands under one owner can have hosted audio.
   * null = unlimited bands (subject to storage/track limits).
   */
  maxBandsWithAudio: number | null;
};

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxTracksPerMonth: 0,
    maxStorageBytes: 0,
    maxBandsWithAudio: 0,
  },
  creator: {
    // ~1 track per week
    maxTracksPerMonth: 4,
    // ~500 MB total audio
    maxStorageBytes: 500 * 1024 * 1024,
    maxBandsWithAudio: 1,
  },
  studio: {
    maxTracksPerMonth: 10,
    // ~2 GB total audio
    maxStorageBytes: 2 * 1024 * 1024 * 1024,
    maxBandsWithAudio: 2,
  },
  label: {
    maxTracksPerMonth: 40,
    // ~10 GB total audio
    maxStorageBytes: 10 * 1024 * 1024 * 1024,
    maxBandsWithAudio: null,
  },
};

export type BandAudioUsage = {
  /** Bytes of audio currently stored for this band. */
  audioStorageBytes: number;
  /** Number of tracks uploaded in the current billing period. */
  audioTracksUploadedThisPeriod: number;
};

export type UploadCheckResult = {
  allowed: boolean;
  /** Optional human-readable explanation when not allowed. */
  reason?: string;
};

/**
 * Check whether a band is allowed to upload another audio track under the
 * given subscription tier and per-band usage.
 *
 * This does not account for how many bands under this owner already have audio;
 * that should be enforced at the query level when you know the owner's bands.
 */
export function canUploadAudioTrack(
  tier: SubscriptionTier,
  usage: BandAudioUsage,
  newFileSizeBytes: number
): UploadCheckResult {
  const limits = SUBSCRIPTION_LIMITS[tier];

  if (limits.maxTracksPerMonth === 0) {
    return {
      allowed: false,
      reason: 'Audio uploads are only available on paid plans.',
    };
  }

  if (usage.audioTracksUploadedThisPeriod >= limits.maxTracksPerMonth) {
    return {
      allowed: false,
      reason: 'You have reached your track upload limit for this period.',
    };
  }

  if (usage.audioStorageBytes + newFileSizeBytes > limits.maxStorageBytes) {
    return {
      allowed: false,
      reason: 'Uploading this file would exceed your audio storage limit.',
    };
  }

  return { allowed: true };
}

