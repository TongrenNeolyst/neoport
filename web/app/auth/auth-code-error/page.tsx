import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-[var(--fg-primary)]">
          Authentication Error
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-secondary)]">
          Something went wrong during authentication. Please try again.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex"
        >
          <Button>Back to Login</Button>
        </Link>
      </Card>
    </div>
  );
}
