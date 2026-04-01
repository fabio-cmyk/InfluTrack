"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TeamMember = {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
  permissions: { permission_key: string; granted: boolean }[];
};

const ALL_PERMISSIONS = [
  "campaigns.view",
  "campaigns.edit",
  "influencers.view",
  "influencers.edit",
  "financials.view",
  "mining.view",
  "branding.edit",
  "team.manage",
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

export async function getTeamMembers(): Promise<{ data: TeamMember[]; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Não autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { data: [], error: "Tenant não encontrado" };

  const { data: members, error } = await supabase
    .from("tenant_users")
    .select("user_id, role, created_at")
    .eq("tenant_id", tenantUser.tenant_id);

  if (error) return { data: [], error: error.message };

  const admin = createAdminClient();
  const result: TeamMember[] = [];

  for (const member of members || []) {
    const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);

    const { data: perms } = await supabase
      .from("user_permissions")
      .select("permission_key, granted")
      .eq("user_id", member.user_id)
      .eq("tenant_id", tenantUser.tenant_id);

    result.push({
      user_id: member.user_id,
      email: authUser?.user?.email || "—",
      role: member.role,
      created_at: member.created_at,
      permissions: perms || [],
    });
  }

  return { data: result };
}

export async function inviteUser(
  email: string,
  permissions: PermissionKey[]
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser || tenantUser.role !== "admin") {
    return { error: "Sem permissão para convidar" };
  }

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      invited_to_tenant: tenantUser.tenant_id,
      invited_by: user.id,
      permissions,
    },
  });

  if (inviteError) return { error: inviteError.message };

  if (invited?.user) {
    await admin.from("tenant_users").insert({
      tenant_id: tenantUser.tenant_id,
      user_id: invited.user.id,
      role: "member",
      invited_by: user.id,
    });

    for (const perm of ALL_PERMISSIONS) {
      await admin.from("user_permissions").insert({
        tenant_id: tenantUser.tenant_id,
        user_id: invited.user.id,
        permission_key: perm,
        granted: permissions.includes(perm),
      });
    }
  }

  revalidatePath("/settings");
  return {};
}

export async function updatePermissions(
  targetUserId: string,
  permissions: PermissionKey[]
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser || tenantUser.role !== "admin") {
    return { error: "Sem permissão" };
  }

  for (const perm of ALL_PERMISSIONS) {
    await supabase
      .from("user_permissions")
      .upsert(
        {
          tenant_id: tenantUser.tenant_id,
          user_id: targetUserId,
          permission_key: perm,
          granted: permissions.includes(perm),
        },
        { onConflict: "tenant_id,user_id,permission_key" }
      );
  }

  revalidatePath("/settings");
  return {};
}

export async function removeMember(targetUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  if (targetUserId === user.id) {
    return { error: "Você não pode se remover" };
  }

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser || tenantUser.role !== "admin") {
    return { error: "Sem permissão" };
  }

  await supabase
    .from("user_permissions")
    .delete()
    .eq("user_id", targetUserId)
    .eq("tenant_id", tenantUser.tenant_id);

  await supabase
    .from("tenant_users")
    .delete()
    .eq("user_id", targetUserId)
    .eq("tenant_id", tenantUser.tenant_id);

  revalidatePath("/settings");
  return {};
}
