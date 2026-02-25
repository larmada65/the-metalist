import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Reviews — The Metalist',
  description: 'Long-form album and release reviews written by metalheads.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
