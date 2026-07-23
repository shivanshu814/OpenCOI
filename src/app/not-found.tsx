import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        That URL doesn’t exist. Head back to the dashboard or marketing site.
      </p>
      <div className="flex gap-4 text-sm">
        <Link href="/app" className="underline">
          Dashboard
        </Link>
        <Link href="/" className="underline">
          Home
        </Link>
      </div>
    </div>
  );
}
