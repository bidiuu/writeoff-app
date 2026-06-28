import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, PlusCircle } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, store_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { count: pendingCount } = await supabase
    .from("writeoff_requests")
    .select("*", { count: "exact", head: true })
    .eq(
      profile.role === "sender" ? "author_id" : "status",
      profile.role === "sender" ? user.id : "pending"
    );

  const roleLabel =
    profile.role === "sender" ? "Отправитель"
    : profile.role === "reviewer" ? "Проверяющий"
    : "Администратор";

  const isSender = profile.role === "sender";

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-400">
        <h1 className="text-xl font-bold text-slate-800">
          Добро пожаловать, {profile.full_name}
        </h1>
        <p className="text-sm text-slate-500">{roleLabel}</p>
      </div>

      <Card className="animate-in fade-in-0 slide-in-from-bottom-3 duration-400" style={{ animationDelay: "60ms" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-600 font-normal">
            {isSender ? "Мои заявки" : "На проверке"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-slate-800">{pendingCount ?? 0}</p>
          <p className="text-sm text-slate-400 mt-0.5">
            {isSender ? "всего заявок" : "ожидают решения"}
          </p>
        </CardContent>
      </Card>

      {isSender ? (
        <Link
          href="/requests/new"
          className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white rounded-xl py-3.5 font-medium hover:bg-slate-800 active:scale-[0.98] transition-all duration-150 animate-in fade-in-0 slide-in-from-bottom-4 duration-400"
          style={{ animationDelay: "120ms" }}
        >
          <PlusCircle size={18} />
          Создать заявку на списание
        </Link>
      ) : (
        <Link
          href="/requests/review"
          className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white rounded-xl py-3.5 font-medium hover:bg-slate-800 active:scale-[0.98] transition-all duration-150 animate-in fade-in-0 slide-in-from-bottom-4 duration-400"
          style={{ animationDelay: "120ms" }}
        >
          <ClipboardList size={18} />
          Открыть очередь проверки
        </Link>
      )}
    </div>
  );
}