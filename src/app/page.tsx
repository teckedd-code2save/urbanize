import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-4 text-black dark:text-white">
        Urbanize
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-lg">
        Analyze and visualize urban parameters like building density and road density within a configurable city area.
      </p>
      <div className="flex gap-4">
        <SignedIn>
          <Link
            href="/map"
            className="rounded-full bg-foreground px-6 py-3 text-background font-medium hover:bg-[#383838] transition-colors"
          >
            Go to Dashboard
          </Link>
        </SignedIn>
        <SignedOut>
          <Link
            href="/sign-in"
            className="rounded-full bg-foreground px-6 py-3 text-background font-medium hover:bg-[#383838] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full border border-black/10 px-6 py-3 font-medium text-black dark:text-white hover:bg-black/5 transition-colors dark:border-white/15 dark:hover:bg-white/5"
          >
            Sign Up
          </Link>
        </SignedOut>
      </div>
    </div>
  );
}
