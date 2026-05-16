// FR-PS-01 (stub — full implementation Phase 9)
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";
import { signout } from "@/app/auth/signout/actions";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <Container className="py-6">
      <Heading level={1} className="text-xl sm:text-2xl mb-2">
        Profile
      </Heading>
      <div className="mt-4 space-y-1">
        <p className="font-medium text-foreground">
          {profile?.full_name ?? "—"}
        </p>
        <p className="text-muted-foreground text-sm">{user.email}</p>
        <p className="text-muted-foreground text-xs capitalize">
          {profile?.role}
        </p>
      </div>
      <form action={signout} className="mt-8">
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium
            text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </form>
    </Container>
  );
}
