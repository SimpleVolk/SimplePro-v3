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
      <body>{children}</body>
    </html>
  );
}
