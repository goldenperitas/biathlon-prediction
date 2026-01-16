import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export async function AuthButton() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {user.user_metadata.display_name || user.email}
        </span>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm font-medium hover:underline"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <Link href="/login" className="text-sm font-medium hover:underline">
      Sign in
    </Link>
  );
}
