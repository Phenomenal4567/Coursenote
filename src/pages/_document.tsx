import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en" data-theme="dark">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Sora:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <meta name="description" content="Free engineering course notes PDF hub for students" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
