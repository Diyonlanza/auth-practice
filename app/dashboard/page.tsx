import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LogoutButton from "@/app/dashboard/LogoutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}</p>
      <LogoutButton />
    </div>
  );
}