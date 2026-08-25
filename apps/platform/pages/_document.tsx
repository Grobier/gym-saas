import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const faviconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#5B4FD6"/>
      <path d="M18 44V20h8l6 12 6-12h8v24h-7V31l-5 10h-4l-5-10v13h-7z" fill="#FFFFFF"/>
    </svg>
  `;

  return (
    <Html lang="es">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href={`data:image/svg+xml,${encodeURIComponent(faviconSvg)}`}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
