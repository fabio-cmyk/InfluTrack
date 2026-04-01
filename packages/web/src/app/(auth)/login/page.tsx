import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">InfluTrack</CardTitle>
        <CardDescription>Entre na sua conta</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
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
            autoComplete="current-password"
          />
        </div>

        <Button className="w-full">Entrar</Button>
      </CardContent>

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
