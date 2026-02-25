import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Bands — The Metalist',
  description: 'Discover metal bands from around the world. Filter by genre and influence.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
