"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "confirm" ? "That confirmation link didn't work. Try signing in, or sign up again." : null,
  );
  const [checkEmail, setCheckEmail] = useState(false);

  if (!supabaseConfigured) {
    return (
      <Card className="w-full max-w-sm text-sm text-roast">
        Supabase isn&apos;t configured yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code> (see the README).
      </Card>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (error) return setError(error.message);
      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
      } else {
        setCheckEmail(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    }
  }

  if (checkEmail) {
    return (
      <Card className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-semibold">Check your inbox</h1>
        <p className="mt-2 text-sm text-mocha">
          We sent a confirmation link to <strong>{email}</strong>. Click it to finish signing up.
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-mocha">
        {mode === "signup" ? "Free, and takes about two minutes to set up." : "Sign in to see today's coffee."}
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {mode === "signup" && (
          <Field label="Your name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </Field>
        )}
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label="Password" hint={mode === "signup" ? "At least 6 characters." : undefined}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </Field>
        <ErrorNote message={error} />
        <Button type="submit" loading={loading} size="lg">
          {mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-mocha">
        {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
          }}
          className="font-medium text-crema-dark hover:underline"
        >
          {mode === "signup" ? "Sign in" : "Create an account"}
        </button>
      </p>
    </Card>
  );
}
