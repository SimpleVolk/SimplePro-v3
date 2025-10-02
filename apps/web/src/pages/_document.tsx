import { Html, Head, Main, NextScript } from 'next/document';

// Minimal _document for error page generation only
// Main app uses App Router (src/app)
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
