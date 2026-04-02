import { type ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — minimal branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground flex-col items-center justify-center gap-8 p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-3 w-3 rounded-full bg-background" />
          <span className="text-2xl font-bold text-background tracking-tight lowercase">
            influtrack
          </span>
        </div>
        <p className="text-background/50 text-center max-w-xs text-sm leading-relaxed">
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
