import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Rankings — The Metalist',
  description: 'The highest-rated metal releases on The Metalist, ranked by community scores.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
