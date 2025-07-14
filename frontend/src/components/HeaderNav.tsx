import { NavLink } from "react-router-dom";
import {
  UploadCloudLineIcon,
  AnalysisIcon,
  SearchLineIcon,
  QuestionLineIcon,
} from "@ifrc-go/icons";

/* Style helper for active vs. inactive nav links */
const navLink = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
    isActive ? "text-ifrcRed font-semibold" : "text-gray-600 hover:text-ifrcRed"
  }`;

/* Put page info in one list so it’s easy to extend */
const navItems = [
  { to: "/upload",    label: "Upload",    Icon: UploadCloudLineIcon },
  { to: "/analytics", label: "Analytics", Icon: AnalysisIcon },
  { to: "/explore",   label: "Explore",   Icon: SearchLineIcon },
];

export default function HeaderNav() {
  return (
    <header className="bg-white border-b border-ifrcRed/40">
      <div className="flex items-center justify-between px-6 py-3">

        {/* ── Logo + title ─────────────────────────── */}
        <NavLink to="/" className="flex items-center gap-2">
          <img src="/ifrc-logo.svg" alt="IFRC logo" className="h-6" />
          <span className="font-semibold">PromptAid Vision</span>
        </NavLink>

        {/* ── Centre nav links ─────────────────────── */}
        <nav className="flex gap-6">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={navLink}>
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>

        {/* ── Right-side utility buttons ───────────── */}
        <NavLink to="/help" className={navLink}>
          <QuestionLineIcon className="w-4 h-4" />
        </NavLink>
      </div>
    </header>
  );
}
