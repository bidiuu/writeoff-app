import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewQueue } from "@/components/requests/review-queue";

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "sender") redirect("/requests/new");

  const [requestsResult, profilesResult] = await Promise.all([
    supabase
      .from("writeoff_requests")
      .select("*, store:stores(name), author:profiles!writeoff_requests_author_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const profileMap = new Map<string, string>(
    (profilesResult.data ?? []).map((p) => [p.id, p.full_name ?? ""])
  );

  const requests = (requestsResult.data ?? []).map((r) => ({
    ...r,
    deducted_employee: r.deducted_employee_id
      ? { full_name: profileMap.get(r.deducted_employee_id) ?? null }
      : null,
  }));

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-slate-800 mb-2">Очередь проверки</h1>
      <p className="text-sm text-slate-500 mb-6">
        {requests?.length ? `${requests.length} заявок ожидают решения` : "Нет заявок на проверку"}
      </p>
      <ReviewQueue initialRequests={requests ?? []} />
    </div>
  );
}
