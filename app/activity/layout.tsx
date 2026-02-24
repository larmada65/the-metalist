import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Activity — The Metalist',
  description: 'See what\'s happening on The Metalist — new bands, releases, shows, and members joining.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
