import { type ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — warm gradient */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-[oklch(0.6_0.18_350)] flex-col items-center justify-center gap-8 p-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm">
          <span className="text-2xl font-extrabold text-white">IT</span>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            InfluTrack
          </h2>
          <p className="text-white/70 mt-3 max-w-xs text-sm leading-relaxed">
            Rastreie o ROI real dos seus influencers. Campanhas, vendas e lucro em um so lugar.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        {children}
      </div>
    </div>
  );
}
