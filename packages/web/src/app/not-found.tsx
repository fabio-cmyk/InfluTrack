import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background">
      <div className="text-8xl font-extrabold text-primary/20">404</div>
      <h1 className="text-2xl font-bold">Pagina nao encontrada</h1>
      <p className="text-muted-foreground text-sm">
        A pagina que voce procura nao existe ou foi removida.
      </p>
      <Link href="/">
        <Button>Voltar ao Dashboard</Button>
      </Link>
    </div>
  );
}
