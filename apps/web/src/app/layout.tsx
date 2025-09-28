import './global.css';

export const metadata = {
  title: 'SimplePro - Moving Company Management',
  description: 'Professional moving company management system with deterministic pricing',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SimplePro',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'SimplePro',
    title: 'SimplePro - Moving Company Management',
    description: 'Professional moving company management system with deterministic pricing',
  },
  robots: {
    index: false, // Internal application
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#4caf50" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SimplePro" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch for API domains */}
        <link rel="dns-prefetch" href="//api.simplepro.com" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }

              // Performance monitoring
              if ('performance' in window && 'observe' in PerformanceObserver.prototype) {
                const observer = new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (entry.entryType === 'largest-contentful-paint') {
                      console.log('LCP:', entry.startTime);
                    }
                    if (entry.entryType === 'first-input') {
                      console.log('FID:', entry.processingStart - entry.startTime);
                    }
                    if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                      console.log('CLS:', entry.value);
                    }
                  }
                });

                observer.observe({entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift']});
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
