import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Shows & Tour Dates — The Metalist',
  description: 'Upcoming gigs and tour dates from metal bands on The Metalist.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
