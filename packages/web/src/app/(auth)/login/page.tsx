"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signIn, signInWithMagicLink } from "../actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignIn(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleMagicLink(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await signInWithMagicLink(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setMagicLinkSent(true);
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">InfluTrack</CardTitle>
        <CardDescription>Entre na sua conta</CardDescription>
      </CardHeader>

      <form action={handleSignIn}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {magicLinkSent && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              Link enviado! Verifique seu e-mail.
            </div>
          )}

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
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={loading}
            formAction={handleMagicLink}
          >
            Entrar com Magic Link
          </Button>
        </CardContent>
      </form>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/register" className="text-primary underline-offset-4 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
