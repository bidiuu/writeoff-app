import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PushPrompt } from "@/components/push-prompt";
import { OfflineBanner } from "@/components/offline-banner";
import { ErrorBoundary } from "@/components/error-boundary";
import { BahandiLogo } from "@/components/bahandi-logo";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login?error=no_profile");
  }

  if (!profile.full_name?.trim()) {
    redirect("/setup-profile");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-border px-4 py-2.5 flex items-center justify-between shadow-[0_1px_0_0_oklch(0.92_0.015_55)]">
        <BahandiLogo size="sm" variant="dark" />
        <span className="text-xs text-muted-foreground font-medium">{profile.full_name}</span>
      </header>
      <PushPrompt role={profile.role} />
      <OfflineBanner />
      <main className="flex-1 pb-20 overflow-auto">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <BottomNav role={profile.role} />
    </div>
  );
}