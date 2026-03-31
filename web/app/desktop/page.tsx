import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOutAction } from "@/features/auth";
import { getCurrentUser, getCurrentUserRole } from "@/features/auth/server";

export default async function DesktopPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole();

  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const welcome = fullName || user?.email || "User";

  const showReports = role === "admin" || role === "sa" || role === "analyst";
  const showAdmin = role === "admin";

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="text-xl font-semibold text-[var(--fg-primary)]">Neoport</div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            <div className="hidden text-sm text-[var(--fg-secondary)] sm:block">
              Welcome,{" "}
              <span className="font-medium text-[var(--fg-primary)]">{welcome}</span>
            </div>

            <form action={signOutAction}>
              <Button variant="secondary" type="submit">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="space-y-8">
          {showReports && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--fg-tertiary)]">
                Reports
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <a
                  href="/published-reports"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <Card className="flex h-full flex-col p-4 transition-all group-hover:border-[var(--border-default)] group-hover:bg-[var(--bg-surface-hover)]">
                    <div className="mb-2 text-2xl">📊</div>
                    <div className="font-medium text-[var(--fg-primary)]">Published Reports</div>
                    <div className="mt-1 text-sm text-[var(--fg-tertiary)]">
                      View published reports
                    </div>
                  </Card>
                </a>
              </div>
            </section>
          )}

          {showAdmin && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--fg-tertiary)]">
                Admin
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <a href="/users" target="_blank" rel="noopener noreferrer" className="group">
                  <Card className="flex h-full flex-col p-4 transition-all group-hover:border-[var(--border-default)] group-hover:bg-[var(--bg-surface-hover)]">
                    <div className="mb-2 text-2xl">👤</div>
                    <div className="font-medium text-[var(--fg-primary)]">用户管理</div>
                    <div className="mt-1 text-sm text-[var(--fg-tertiary)]">
                      Manage users
                    </div>
                  </Card>
                </a>

                <a href="/email-config" target="_blank" rel="noopener noreferrer" className="group">
                  <Card className="flex h-full flex-col p-4 transition-all group-hover:border-[var(--border-default)] group-hover:bg-[var(--bg-surface-hover)]">
                    <div className="mb-2 text-2xl">📧</div>
                    <div className="font-medium text-[var(--fg-primary)]">邮件配置</div>
                    <div className="mt-1 text-sm text-[var(--fg-tertiary)]">
                      SMTP settings
                    </div>
                  </Card>
                </a>

                <a href="/subscriptions" target="_blank" rel="noopener noreferrer" className="group">
                  <Card className="flex h-full flex-col p-4 transition-all group-hover:border-[var(--border-default)] group-hover:bg-[var(--bg-surface-hover)]">
                    <div className="mb-2 text-2xl">📬</div>
                    <div className="font-medium text-[var(--fg-primary)]">邮件外发订阅</div>
                    <div className="mt-1 text-sm text-[var(--fg-tertiary)]">
                      Email subscriptions
                    </div>
                  </Card>
                </a>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
