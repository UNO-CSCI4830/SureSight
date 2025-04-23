import '../styles/globals.css'
import '../styles/Dashboard.css'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  // Each page can handle its own layout, allowing for custom layouts when needed
  return <Component {...pageProps} />
}
