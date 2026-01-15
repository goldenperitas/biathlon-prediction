import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Welcome, {user.user_metadata.display_name || user.email}!
      </p>
      <div className="mt-8 p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg">
        <p className="text-zinc-500 dark:text-zinc-500">
          Upcoming races and predictions will appear here.
        </p>
      </div>
    </main>
  );
}
