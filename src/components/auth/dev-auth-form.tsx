"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const OAUTH_PROVIDERS = [
  { name: "Google", icon: "G" },
  { name: "Apple", icon: "" },
  { name: "Microsoft", icon: "" },
] as const;

export function DevAuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/dev-auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.title ?? "Unable to sign in. Please try again.");
      }
      router.push("/research");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-center font-serif text-3xl font-bold text-foreground">
        {mode === "sign-in" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {mode === "sign-in"
          ? "Sign in to your account to run lookups, view your history, and manage your plan."
          : "Get 5 free lookups to explore property insights, reports, and ownership details."}
      </p>

      <Alert variant="info" className="mt-5">
        This build runs in development authentication mode (no external identity
        provider is configured yet). Enter any name/email to continue — no
        password is checked. Real Clerk-backed sign-in activates automatically
        once credentials are supplied.
      </Alert>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "sign-up" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <div className="relative mt-1.5">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="firstName"
                  className="pl-9"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                className="mt-1.5"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
        ) : null}

        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {mode === "sign-in" ? (
              <span className="text-xs font-medium text-primary">Forgot password?</span>
            ) : null}
          </div>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder={mode === "sign-in" ? "Enter your password" : "Create a password"}
              className="pl-9"
              disabled
              title="Password is not required in development authentication mode."
            />
          </div>
        </div>

        {error ? <p className="text-sm text-risk-critical">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        Or continue with
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2.5">
        {OAUTH_PROVIDERS.map((provider) => (
          <button
            key={provider.name}
            type="button"
            disabled
            title="Social sign-in activates once an identity provider is connected."
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground opacity-60"
          >
            Continue with {provider.name}
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="font-medium text-primary">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-primary">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
