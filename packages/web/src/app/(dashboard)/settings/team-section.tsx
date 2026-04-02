"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Pencil, Trash2 } from "lucide-react";
import { getTeamMembers, removeMember, type TeamMember } from "./actions";
import { InviteModal } from "./invite-modal";
import { PermissionsModal } from "./permissions-modal";

const PERMISSION_LABELS: Record<string, string> = {
  "campaigns.view": "Ver campanhas",
  "campaigns.edit": "Editar campanhas",
  "influencers.view": "Ver influencers",
  "influencers.edit": "Editar influencers",
  "financials.view": "Ver financeiro",
  "mining.view": "Ver mineração",
  "branding.edit": "Editar branding",
  "team.manage": "Gerenciar equipe",
};

export function TeamSection() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const { data } = await getTeamMembers();
    setMembers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRemove(userId: string) {
    const result = await removeMember(userId);
    if (result.error) {
      alert(result.error);
      return;
    }
    loadMembers();
  }

  function getGrantedPermissions(member: TeamMember): string[] {
    if (member.role === "admin") return Object.keys(PERMISSION_LABELS);
    return member.permissions
      .filter((p) => p.granted)
      .map((p) => p.permission_key);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Equipe</CardTitle>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Convidar
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Carregando...
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum membro encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium">{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                        {member.role === "admin" ? "Admin" : "Membro"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.role === "admin" ? (
                          <Badge variant="outline" className="text-xs">
                            Acesso total
                          </Badge>
                        ) : (
                          getGrantedPermissions(member).map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {PERMISSION_LABELS[perm] || perm}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.role !== "admin" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingMember(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(member.user_id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={loadMembers}
      />

      {editingMember && (
        <PermissionsModal
          member={editingMember}
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          onSuccess={loadMembers}
        />
      )}
    </>
  );
}
