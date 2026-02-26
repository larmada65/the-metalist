export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        <p className="text-xs text-zinc-600 uppercase tracking-widest">Loading…</p>
      </div>
    </div>
  )
}
