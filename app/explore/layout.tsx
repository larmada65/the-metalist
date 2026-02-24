import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Explore Bands — The Metalist',
  description: 'Discover metal bands from around the world. Filter by genre, country, and influence.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
