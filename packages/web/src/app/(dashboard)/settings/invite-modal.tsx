"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { inviteUser, type PermissionKey } from "./actions";

const PERMISSIONS: { key: PermissionKey; label: string }[] = [
  { key: "campaigns.view", label: "Ver campanhas" },
  { key: "campaigns.edit", label: "Editar campanhas" },
  { key: "influencers.view", label: "Ver influencers" },
  { key: "influencers.edit", label: "Editar influencers" },
  { key: "financials.view", label: "Ver financeiro" },
  { key: "mining.view", label: "Ver mineração" },
  { key: "branding.edit", label: "Editar branding" },
  { key: "team.manage", label: "Gerenciar equipe" },
];

export function InviteModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Set<PermissionKey>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function togglePermission(key: PermissionKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    const result = await inviteUser(email, Array.from(selected));
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setEmail("");
    setSelected(new Set());
    setLoading(false);
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Membro</DialogTitle>
          <DialogDescription>
            Envie um convite por email e defina as permissões.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colega@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Permissões</Label>
            <div className="grid grid-cols-1 gap-3">
              {PERMISSIONS.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(perm.key)}
                    onCheckedChange={() => togglePermission(perm.key)}
                  />
                  <span className="text-sm">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!email || loading}>
            {loading ? "Enviando..." : "Enviar Convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
