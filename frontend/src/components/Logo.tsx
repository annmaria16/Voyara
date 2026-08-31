
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

interface LogoProps {
  subtitle?: string;
  to?: string;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ subtitle = "Outcome Verification", to = "/", size = "md" }: LogoProps) {
  const iconSize = size === "sm" ? 18 : size === "md" ? 22 : 24;
  const paddingClass = size === "sm" ? "p-1.5 rounded-lg" : size === "md" ? "p-2 rounded-xl" : "p-2.5 rounded-xl";
  const titleClass = size === "sm" ? "text-base font-black tracking-wide leading-none" : "text-xl font-black tracking-wide leading-none";
  const subtitleClass = size === "sm" ? "text-[8px] tracking-[0.12em] font-bold uppercase mt-0.5" : "text-[9px] tracking-[0.15em] font-bold uppercase mt-1";

  return (
    <Link to={to} className="flex items-center gap-3 cursor-pointer group">
      <div className={`bg-gradient-to-br from-[#FF6B00] to-[#FF8A1F] ${paddingClass} shadow-lg shadow-orange-500/10 group-hover:shadow-orange-500/30 transition-all duration-300 flex items-center justify-center`}>
        <ShieldCheck className="text-white" size={iconSize} />
      </div>
      <div className="text-left">
        <h1 className={`${titleClass} text-dash-text group-hover:text-dash-primary transition-colors`}>
          VeriNova
        </h1>
        <p className={`${subtitleClass} text-dash-secondary`}>
          {subtitle}
        </p>
      </div>
    </Link>
  );
}
