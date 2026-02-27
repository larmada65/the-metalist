/* eslint-disable jsx-a11y/media-has-caption */
'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'

export type PlayerTrack = {
  id: string
  title: string
  bandName: string
  bandSlug?: string
  releaseTitle?: string
  releaseId?: string
  coverUrl?: string | null
  src: string
}

type AudioPlayerContextValue = {
  currentTrack: PlayerTrack | null
  isPlaying: boolean
  currentTime: number
  duration: number
  setTrackAndPlay: (track: PlayerTrack) => void
  togglePlay: () => void
  stop: () => void
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | undefined>(undefined)

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider')
  }
  return ctx
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Lazily create the audio element on first use to avoid SSR surprises
  useEffect(() => {
    if (!audioRef.current && typeof Audio !== 'undefined') {
      audioRef.current = new Audio()
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (!Number.isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration)
        setProgress(audio.currentTime / audio.duration)
      }
    }

    const handleDurationChange = () => {
      if (!Number.isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const setTrackAndPlay = useCallback((track: PlayerTrack) => {
    const audio = audioRef.current
    if (!audio) return

    const isSameTrack = currentTrack && currentTrack.id === track.id && currentTrack.src === track.src
    if (!isSameTrack) {
      setCurrentTrack(track)
      setProgress(0)
      setCurrentTime(0)
      setDuration(0)
      audio.src = track.src
    }

    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        // Autoplay might be blocked; keep state consistent
        setIsPlaying(false)
      })
  }, [currentTrack])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (audio.paused) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }, [currentTrack])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
    setCurrentTrack(null)
  }, [])

  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration || Number.isNaN(audio.duration)) return
    const next = Math.min(Math.max(ratio, 0), 1)
    audio.currentTime = audio.duration * next
    setProgress(next)
  }, [])

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || Number.isNaN(seconds) || seconds < 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const value = useMemo<AudioPlayerContextValue>(() => ({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    setTrackAndPlay,
    togglePlay,
    stop,
  }), [currentTrack, isPlaying, currentTime, duration, setTrackAndPlay, togglePlay, stop])

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seek(ratio)
  }

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}

      {currentTrack && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-black">
          <div className="mx-auto max-w-5xl px-3 pb-2 md:px-6 md:pb-4">
            <div className="rounded-t-xl bg-zinc-950/95 border border-zinc-800/90 shadow-2xl shadow-black/60 backdrop-blur-md">
              <div className="flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-3">
                {/* Play / pause */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shrink-0"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 5.25C7 4.558 7.75 4.15 8.333 4.5l9.333 5.25a1 1 0 010 1.732l-9.333 5.25A1 1 0 017 15.75v-10.5z" />
                    </svg>
                  )}
                </button>

                {/* Artwork + meta */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded bg-zinc-900 border border-zinc-800/80 shrink-0">
                    {currentTrack.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentTrack.coverUrl}
                        alt={currentTrack.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg">💿</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {currentTrack.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      {currentTrack.bandSlug ? (
                        <Link
                          href={`/bands/${currentTrack.bandSlug}`}
                          className="truncate hover:text-red-400 transition-colors"
                        >
                          {currentTrack.bandName}
                        </Link>
                      ) : (
                        <span className="truncate">{currentTrack.bandName}</span>
                      )}
                      {currentTrack.releaseTitle && (
                        <>
                          <span className="text-zinc-700">•</span>
                          {currentTrack.releaseId ? (
                            <Link
                              href={`/releases/${currentTrack.releaseId}`}
                              className="truncate hover:text-red-400 transition-colors"
                            >
                              {currentTrack.releaseTitle}
                            </Link>
                          ) : (
                            <span className="truncate">{currentTrack.releaseTitle}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Close */}
                <button
                  type="button"
                  onClick={stop}
                  className="ml-1 hidden h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-400 transition-colors md:flex"
                  aria-label="Stop"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              </div>

              {/* Timer + Progress bar */}
              <div className="flex items-center gap-3 px-3 pb-2 md:px-4 md:pb-3 rounded-b-xl">
                <span className="text-[10px] md:text-xs tabular-nums text-zinc-500 shrink-0">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <div
                  className="group relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-zinc-900"
                  onClick={handleProgressClick}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-r-full bg-gradient-to-r from-red-600 via-red-500 to-red-400 transition-[width]"
                    style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
                  />
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-100/10 via-zinc-100/0 to-zinc-100/10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className="bg-black md:hidden"
            style={{ height: 'env(safe-area-inset-bottom, 0px)' }}
          />
        </div>
      )}
    </AudioPlayerContext.Provider>
  )
}

