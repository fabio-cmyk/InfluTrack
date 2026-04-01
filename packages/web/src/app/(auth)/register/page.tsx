"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signUp } from "../actions";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">InfluTrack</CardTitle>
        <CardDescription>Crie sua conta</CardDescription>
      </CardHeader>

      <form action={handleSignUp}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="brand">Nome da Marca</Label>
            <Input
              id="brand"
              name="brand"
              type="text"
              placeholder="Minha Marca"
              autoComplete="organization"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="voce@empresa.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </Button>
        </CardContent>
      </form>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
