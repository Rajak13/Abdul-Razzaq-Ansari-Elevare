// Root layout - locale-specific html/body tags are in [locale]/layout.tsx
// This should only return children to avoid nested html/body tags
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
