import './global.css';

// Force dynamic rendering for entire app (prevents static generation issues with auth context)
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export const metadata = {
  title: 'SimplePro - Moving Company Management',
  description:
    'Professional moving company management system with deterministic pricing',
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
    description:
      'Professional moving company management system with deterministic pricing',
  },
  robots: {
    index: false, // Internal application
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
    shortcut: '/favicon.ico',
  },
};

export const viewport = {
  themeColor: '#4caf50',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
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
                  navigator.serviceWorker.register('/sw.js').catch(() => {
                    // Service worker registration failed silently
                  });
                });
              }

              // Performance monitoring
              if ('performance' in window && 'observe' in PerformanceObserver.prototype) {
                const observer = new PerformanceObserver((list) => {
                  // Performance metrics collected silently
                  // LCP, FID, CLS metrics available via Performance API
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
