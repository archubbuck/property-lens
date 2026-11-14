"use client";

import { useEffect, useState } from "react";
import {
  User as UserIcon,
  Lock,
  Bell,
  Link2,
  Mail,
  FileText,
  Layers,
  CreditCard,
  Megaphone,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type AccountUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

type NotificationPreference = {
  researchReports: boolean;
  usageAndPlanUpdates: boolean;
  billingAndPayments: boolean;
  productUpdates: boolean;
  tipsAndInsights: boolean;
  digestFrequency: "real_time" | "weekly" | "monthly";
};

type TabKey = "profile" | "security" | "notifications" | "connected";

const NAV_ITEMS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "profile", label: "Profile", icon: UserIcon },
  { key: "security", label: "Security", icon: Lock },
  { key: "notifications", label: "Email & Notifications", icon: Bell },
  { key: "connected", label: "Connected Accounts", icon: Link2 },
];

const NOTIFICATION_TOGGLES: {
  key: keyof Omit<NotificationPreference, "digestFrequency">;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "researchReports",
    label: "Research reports",
    description: "Get an email when a property report is ready.",
    icon: FileText,
  },
  {
    key: "usageAndPlanUpdates",
    label: "Usage & plan updates",
    description: "Updates about your lookup usage and plan limits.",
    icon: Layers,
  },
  {
    key: "billingAndPayments",
    label: "Billing & payments",
    description: "Receipts, renewals, and payment confirmations.",
    icon: CreditCard,
  },
  {
    key: "productUpdates",
    label: "Product updates",
    description: "New features, data sources, and improvements.",
    icon: Megaphone,
  },
  {
    key: "tipsAndInsights",
    label: "Tips & insights",
    description: "Property research tips, guides, and best practices.",
    icon: Sparkles,
  },
];

const DIGEST_OPTIONS: { value: NotificationPreference["digestFrequency"]; label: string; description: string }[] = [
  { value: "real_time", label: "As they happen", description: "Receive updates in real time." },
  { value: "weekly", label: "Weekly digest", description: "A single email with this week's updates." },
  { value: "monthly", label: "Monthly digest", description: "A single email with the month's highlights." },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-risk-low" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-card shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

/**
 * Self-contained "Manage Account" modal. Profile and Email & Notifications
 * are backed by real, app-owned data (`User` / `NotificationPreference`).
 * Security (password) and Connected Accounts (OAuth linking) are
 * Clerk-exclusive capabilities — see src/server/auth/session.ts
 * `isClerkConfigured()` — so they render an honest "managed by your identity
 * provider" explanation instead of a non-functional form.
 */
export function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>("profile");

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [preference, setPreference] = useState<NotificationPreference | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- begins a fresh data fetch whenever the dialog opens.
    setLoading(true);
    (async () => {
      try {
        const [profileRes, notificationsRes] = await Promise.all([
          fetch("/api/v1/account/profile"),
          fetch("/api/v1/account/notifications"),
        ]);
        if (!profileRes.ok || !notificationsRes.ok) throw new Error("Failed to load account data.");
        const profileJson = await profileRes.json();
        const notificationsJson = await notificationsRes.json();
        if (cancelled) return;
        setUser(profileJson.user);
        setFirstName(profileJson.user.firstName ?? "");
        setLastName(profileJson.user.lastName ?? "");
        setPreference(notificationsJson.preference);
      } catch {
        if (!cancelled) {
          toast({
            variant: "error",
            title: "Couldn't load account details",
            description: "Please close this dialog and try again.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/v1/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      if (!res.ok) throw new Error("Request failed");
      const json = await res.json();
      setUser(json.user);
      toast({ variant: "success", title: "Profile updated" });
    } catch {
      toast({ variant: "error", title: "Couldn't save profile", description: "Please try again." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveNotifications() {
    if (!preference) return;
    setSavingNotifications(true);
    try {
      const res = await fetch("/api/v1/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preference),
      });
      if (!res.ok) throw new Error("Request failed");
      const json = await res.json();
      setPreference(json.preference);
      toast({ variant: "success", title: "Notification preferences updated" });
    } catch {
      toast({ variant: "error", title: "Couldn't save preferences", description: "Please try again." });
    } finally {
      setSavingNotifications(false);
    }
  }

  function handleSave() {
    if (tab === "profile") void saveProfile();
    else if (tab === "notifications") void saveNotifications();
    else onOpenChange(false);
  }

  const showSave = tab === "profile" || tab === "notifications";
  const saving = tab === "profile" ? savingProfile : savingNotifications;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <div className="p-6 pb-0">
          <DialogHeader
            title="Manage Account"
            description="Update your profile, sign-in details, and security settings."
            onClose={() => onOpenChange(false)}
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex flex-col gap-0 px-6 sm:flex-row sm:gap-6">
          <TabsList className="h-fit w-full shrink-0 flex-col items-stretch gap-1 border-b-0 border-r-0 sm:w-56 sm:border-r sm:pr-4">
            {NAV_ITEMS.map((item) => (
              <TabsTrigger
                key={item.key}
                value={item.key}
                icon={<item.icon className="h-4 w-4" />}
                className={cn(
                  "w-full justify-start rounded-md border-b-0 px-3 py-2 text-left",
                  tab === item.key ? "bg-risk-low/10 text-primary" : "hover:bg-muted"
                )}
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-h-[360px] flex-1 py-1">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <TabsContent value="profile" className="space-y-5">
                  <div>
                    <h3 className="font-serif text-xl font-semibold">Profile</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This information is stored directly in your PropertyLens account.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        maxLength={60}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        maxLength={60}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" value={user?.email ?? ""} readOnly disabled />
                    <p className="text-xs text-muted-foreground">
                      Email changes go through your identity provider and aren&apos;t editable here.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-5">
                  <div>
                    <h3 className="font-serif text-xl font-semibold">Security</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Manage your password and sign-in security.
                    </p>
                  </div>
                  <Alert variant="neutral" title="Managed by your identity provider">
                    Password changes and other security settings are handled by our identity
                    provider (Clerk) rather than PropertyLens directly. This section will activate
                    automatically once Clerk is fully configured for this environment — in the
                    meantime there is no password to change here, and we won&apos;t show you a form
                    that could silently fail.
                  </Alert>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-5">
                  <div>
                    <h3 className="font-serif text-xl font-semibold">Email & Notifications</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Control which emails you receive and how you&apos;re notified about your research.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">Email address</p>
                        <p className="text-sm text-muted-foreground">
                          The email we use for account, billing, and important updates.
                        </p>
                        <p className="mt-2 text-sm font-medium">{user?.email}</p>
                      </div>
                      <Badge variant="success">Verified</Badge>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex items-start gap-3">
                      <Bell className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Notification preferences</p>
                        <p className="text-sm text-muted-foreground">Choose which updates you&apos;d like to receive.</p>
                      </div>
                    </div>
                    <div className="divide-y divide-border">
                      {NOTIFICATION_TOGGLES.map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-4 py-3">
                          <div className="flex items-start gap-3">
                            <item.icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                          <Toggle
                            label={item.label}
                            checked={preference?.[item.key] ?? false}
                            onChange={(next) =>
                              setPreference((prev) => (prev ? { ...prev, [item.key]: next } : prev))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex items-start gap-3">
                      <CalendarClock className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Notification frequency</p>
                        <p className="text-sm text-muted-foreground">
                          Choose how often to receive non-critical updates (product, tips, and insights).
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {DIGEST_OPTIONS.map((option) => {
                        const active = preference?.digestFrequency === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setPreference((prev) => (prev ? { ...prev, digestFrequency: option.value } : prev))
                            }
                            className={cn(
                              "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                              active ? "border-risk-low/40 bg-risk-low/10" : "border-border hover:bg-muted"
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                                active ? "border-risk-low" : "border-muted-foreground"
                              )}
                            >
                              {active && <span className="h-2 w-2 rounded-full bg-risk-low" />}
                            </span>
                            <span>
                              <span className="block text-sm font-medium">{option.label}</span>
                              <span className="block text-xs text-muted-foreground">{option.description}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="connected" className="space-y-5">
                  <div>
                    <h3 className="font-serif text-xl font-semibold">Connected Accounts</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Link additional sign-in methods to make your account more flexible and secure.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <p className="mb-3 font-medium">Linked accounts</p>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border">
                          <Mail className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">Email & Password</p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <Badge variant="success">Connected</Badge>
                    </div>
                  </div>

                  <Alert variant="neutral" title="Managed by your identity provider">
                    Linking Google, Apple, Microsoft, or other social sign-in methods is handled by
                    our identity provider (Clerk) and isn&apos;t something PropertyLens can safely
                    reimplement on its own. Once Clerk is fully configured for this environment,
                    connected-account options will appear here automatically — we won&apos;t show
                    fake &quot;Connect&quot; buttons that do nothing.
                  </Alert>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        <div className="px-6 pb-6">
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {showSave ? (
              <Button onClick={handleSave} disabled={loading || saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            ) : (
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
