import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { useEffect } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('__cn_theme__') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  return <Component {...pageProps} />
}
