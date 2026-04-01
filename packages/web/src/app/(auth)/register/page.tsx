import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">InfluTrack</CardTitle>
        <CardDescription>Crie sua conta</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Nome da Marca</Label>
          <Input
            id="brand"
            type="text"
            placeholder="Minha Marca"
            autoComplete="organization"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="voce@empresa.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        <Button className="w-full">Criar conta</Button>
      </CardContent>

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
