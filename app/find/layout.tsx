import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Find Musicians — The Metalist',
  description: 'Find metal producers and sound engineers available for collaboration.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
