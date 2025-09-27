import './global.css';

export const metadata = {
  title: 'SimplePro - Moving Company Management',
  description: 'Professional moving company management system with deterministic pricing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
