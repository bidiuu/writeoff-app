import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "@/components/requests/request-form";

export default async function NewRequestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "reviewer") redirect("/requests/review");

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Новая заявка на списание</h1>
      <RequestForm />
    </div>
  );
}
