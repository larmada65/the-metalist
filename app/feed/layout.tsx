import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'My Feed — The Metalist',
  description: 'New releases, shows, and reviews from bands and members you follow.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
