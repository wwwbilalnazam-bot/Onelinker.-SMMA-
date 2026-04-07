import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

// Prevent Next.js from caching this layout — must always read fresh auth/profile state
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Use getSession() (reads JWT from cookie locally — no Supabase Auth network call).
  // The middleware's updateSession() already validated the token, so this is safe.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) redirect("/login");

  // Use service client for profile check to bypass RLS — prevents redirect loop
  // when RLS blocks profile reads (e.g. missing SELECT policy).
  const service = createServiceClient();

  // Fetch profile + workspaces in parallel — both only need user.id
  const [{ data: profile }, { data: members }] = await Promise.all([
    service
      .from("profiles")
      .select("onboarded, full_name, avatar_url")
      .eq("id", user.id)
      .single(),
    service
      .from("workspace_members")
      .select("id, role, workspace_id, invited_at, accepted_at, deactivated_at, workspaces(id, name, slug, logo_url, plan)")
      .eq("user_id", user.id)
      .order("invited_at", { ascending: true }),
  ]);

  if (!profile?.onboarded) redirect("/onboarding");

  const memberRows = (members ?? []).map((m) => ({
    workspace: m.workspaces as unknown as import("@/types").Workspace,
    id: m.id,
    role: m.role,
    workspace_id: m.workspace_id,
    invited_at: m.invited_at,
    accepted_at: m.accepted_at,
    deactivated_at: m.deactivated_at,
  })).filter((m) => m.workspace);

  // Only show workspaces where the user is NOT deactivated
  const activeRows = memberRows.filter((m) => !m.deactivated_at);
  const workspaces = activeRows.map((m) => m.workspace);

  // Read persisted workspace from cookie; fall back to first active workspace
  const cookieStore = await cookies();
  const savedWorkspaceId = cookieStore.get("onelinker_workspace_id")?.value;
  const defaultWorkspaceId =
    (savedWorkspaceId && workspaces.some((w) => w.id === savedWorkspaceId)
      ? savedWorkspaceId
      : workspaces[0]?.id) ?? "";

  // Check if the user is deactivated in their selected workspace
  const selectedMemberRow = memberRows.find((m) => m.workspace?.id === defaultWorkspaceId);
  const isDeactivated = !!selectedMemberRow?.deactivated_at;

  // Find the active member record for the selected workspace
  const initialMemberRow = activeRows.find((m) => m.workspace?.id === defaultWorkspaceId);
  const initialMember = initialMemberRow
    ? {
        id: initialMemberRow.id,
        workspace_id: initialMemberRow.workspace_id,
        user_id: user.id,
        role: initialMemberRow.role,
        invited_at: initialMemberRow.invited_at,
        accepted_at: initialMemberRow.accepted_at,
      }
    : null;

  // If user is deactivated in this workspace — show blocked screen
  if (isDeactivated && workspaces.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border border-border/60 bg-card/80 p-8 text-center space-y-4 shadow-lg">
          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto">
            <svg className="h-7 w-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Account Deactivated</h2>
          <p className="text-sm text-muted-foreground">
            Your access to this workspace has been deactivated by the workspace owner. Please contact them to restore your access.
          </p>
        </div>
      </div>
    );
  }

  // If deactivated in selected workspace but has other active workspaces, switch
  if (isDeactivated && workspaces.length > 0) {
    redirect("/home");
  }

  return (
    <WorkspaceProvider
      initialWorkspaces={workspaces}
      initialWorkspaceId={defaultWorkspaceId}
      initialMember={initialMember}
    >
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Header
            user={{
              id: user.id,
              email: user.email ?? "",
              fullName: profile?.full_name ?? "",
              avatarUrl: profile?.avatar_url ?? null,
            }}
          />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
