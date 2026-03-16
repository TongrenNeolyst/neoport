import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOutAction } from "@/features/auth";
import { getCurrentUser, getCurrentUserRole } from "@/features/auth/server";

type Role = "admin" | "sa" | "analyst";

type DesktopCard = {
  key: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  visibleRoles: Role[];
};

const reportsCards: DesktopCard[] = [
  {
    key: "published-reports",
    icon: "📊",
    title: "Published Reports",
    description: "View published reports",
    href: "/published-reports",
    visibleRoles: ["admin", "sa", "analyst"],
  },
];

const systemCards: DesktopCard[] = [
  {
    key: "email-config",
    icon: "📧",
    title: "Email Config",
    description: "Configure email distribution",
    href: "/email-config",
    visibleRoles: ["admin"],
  },
  {
    key: "subscriptions",
    icon: "🔔",
    title: "Subscriptions",
    description: "Manage email subscriptions",
    href: "/subscriptions",
    visibleRoles: ["admin"],
  },
];

export default async function DesktopPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole();

  const visibleReportsCards = reportsCards.filter((card) =>
    role ? card.visibleRoles.includes(role) : false,
  );

  const visibleSystemCards = systemCards.filter((card) =>
    role ? card.visibleRoles.includes(role) : false,
  );

  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const welcome = fullName || user?.email || "User";

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
          <Section title="Reports" cards={visibleReportsCards} />
          {visibleSystemCards.length > 0 && (
            <Section title="System" cards={visibleSystemCards} />
          )}
        </div>
      </main>
    </div>
  );
}

function Section({ title, cards }: { title: string; cards: DesktopCard[] }) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--fg-tertiary)]">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <a
            key={card.key}
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="flex h-full flex-col p-4 transition-all group-hover:border-[var(--border-default)] group-hover:bg-[var(--bg-surface-hover)]">
              <div className="mb-2 text-2xl">{card.icon}</div>
              <div className="font-medium text-[var(--fg-primary)]">{card.title}</div>
              <div className="mt-1 text-sm text-[var(--fg-tertiary)]">
                {card.description}
              </div>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}
