import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Find Talent — The Metalist',
  description: 'Find metal musicians, producers, and sound engineers available for collaboration.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
