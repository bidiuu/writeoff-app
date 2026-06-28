"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BahandiLogo } from "@/components/bahandi-logo";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const noProfile = params.get("error") === "no_profile";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex justify-center mb-8">
        <BahandiLogo size="lg" variant="dark" />
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_16px_oklch(0.16_0.02_35_/_8%),0_1px_4px_oklch(0.16_0.02_35_/_5%)] p-6 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-foreground">Добро пожаловать</h1>
          <p className="text-sm text-muted-foreground">Войдите в свой аккаунт</p>
        </div>

        {noProfile && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
            Профиль не найден. Обратитесь к администратору.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email" type="email" autoComplete="email" required
              placeholder="ivan@bahandi.kz"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">Пароль</Label>
            <Input
              id="password" type="password" autoComplete="current-password" required
              placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 shadow-[0_2px_8px_oklch(0.63_0.175_40_/_30%)]"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Вход...
              </span>
            ) : "Войти"}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Bahandi Burger · Система списания
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}