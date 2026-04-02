import { type ReactNode } from "react";
import { Target } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center gap-6 p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Target className="h-7 w-7 text-primary-foreground" />
          </div>
          <span className="text-3xl font-bold text-primary-foreground tracking-tight">
            InfluTrack
          </span>
        </div>
        <p className="text-primary-foreground/80 text-center max-w-sm text-lg">
          Rastreie o ROI real dos seus influencers. Campanhas, vendas e lucro em um so lugar.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        {children}
      </div>
    </div>
  );
}
