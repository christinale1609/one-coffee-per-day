"use client";

import { ChartColumn, House, LogOut, Search, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { cn, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { Profile } from "@/lib/types";

type ProfileContextValue = {
  profile: Profile | null;
  setProfile: (p: Profile) => void;
  refresh: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside AppShell");
  return ctx;
}

const NAV = [
  { href: "/dashboard", label: "Today", icon: House },
  { href: "/discover", label: "Find people", icon: Search },
  { href: "/tracker", label: "Tracker", icon: Users },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabaseConfigured) {
      setError("Supabase isn't configured yet. Add your keys to .env.local (see the README).");
      return;
    }
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.replace("/login");
      return;
    }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single<Profile>();
    if (error || !data) {
      setError("Couldn't load your profile. Has the database schema been set up?");
      return;
    }
    setProfile(data);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void refresh();
    if (!supabaseConfigured) return;
    void createClient()
      .rpc("is_admin")
      .then(({ data }) => setIsAdmin(data === true));
  }, [refresh]);

  // Anyone who hasn't finished setup goes to onboarding first.
  useEffect(() => {
    if (profile && !profile.onboarded && pathname !== "/onboarding") router.replace("/onboarding");
  }, [profile, pathname, router]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/");
  }

  const nav = isAdmin ? [...NAV, { href: "/insights", label: "Insights", icon: ChartColumn }] : NAV;
  const onboarding = pathname === "/onboarding";

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refresh }}>
      <header className="sticky top-0 z-20 border-b border-latte bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo href="/dashboard" />
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-mocha hover:bg-foam hover:text-espresso"
          >
            <LogOut className="size-4" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
        {!onboarding && (
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`) ||
                (href === "/tracker" && pathname.startsWith("/contacts"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                    active ? "bg-espresso text-cream" : "text-roast hover:bg-foam",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {error ? (
          <p className="rounded-xl bg-berry-soft p-4 text-sm text-berry">{error}</p>
        ) : profile ? (
          children
        ) : (
          <Spinner label="Brewing…" />
        )}
      </main>
    </ProfileContext.Provider>
  );
}
