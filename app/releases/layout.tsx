import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Releases — The Metalist',
  description: 'All albums, EPs, and singles from metal bands on The Metalist.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
