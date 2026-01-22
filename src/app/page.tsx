import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Compete like a biathlete.
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          A new, immersive biathlon prediction game
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
