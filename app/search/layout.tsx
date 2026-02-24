import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Search — The Metalist',
  description: 'Search for metal bands, releases, and musicians on The Metalist.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
