import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <h1 className="text-4xl font-bold">RBAC Configuration Tool</h1>
        <p className="text-muted-foreground">
          Manage roles, permissions, and access to your application. Log in to
          continue.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/login" aria-label="Login">
            <Button>Log in</Button>
          </Link>
          <Link href="/signup" aria-label="Sign up">
            <Button variant="outline">Sign up</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
