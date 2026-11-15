import Link from "next/link";
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-ink-3">404</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">This page isn't in the library</h1>
      <Link href="/" className="mt-6 text-accent underline">Go home</Link>
    </div>
  );
}
