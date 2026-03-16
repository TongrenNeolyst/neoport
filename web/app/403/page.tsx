import { Card } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-[var(--fg-primary)]">403</h1>
        <p className="mt-2 text-sm text-[var(--fg-secondary)]">No permission</p>
      </Card>
    </div>
  );
}
