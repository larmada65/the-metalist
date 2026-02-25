import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Members — The Metalist',
  description: 'Browse metalheads — musicians, producers, and fans on The Metalist.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
