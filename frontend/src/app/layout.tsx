// This root layout is minimal - all locale-specific layouts are in [locale]/layout.tsx
// The middleware will handle redirecting to the appropriate locale
// DO NOT add <html> or <body> tags here - they are in [locale]/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
