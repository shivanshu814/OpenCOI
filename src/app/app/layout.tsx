/**
 * Shared /app segment. Chrome (sidebar) lives in `(workspace)/layout`.
 * Onboarding stays outside that group so it never loses the shell on navigate.
 */
export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
