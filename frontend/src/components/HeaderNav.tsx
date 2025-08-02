import { NavLink, useLocation } from "react-router-dom";
import {
  UploadCloudLineIcon,
  AnalysisIcon,
  SearchLineIcon,
  QuestionLineIcon,
  GoMainIcon,
} from "@ifrc-go/icons";

/* Style helper for active vs. inactive nav links */
const navLink = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1 px-4 sm:px-6 py-2 text-xs sm:text-sm transition-colors whitespace-nowrap mx-4 sm:mx-6
  ${isActive ? "text-ifrcRed font-semibold" : "text-gray-600 hover:text-ifrcRed"}`;

/* Put page info in one list so it’s easy to extend */
const navItems = [
  { to: "/upload",    label: "Upload",    Icon: UploadCloudLineIcon },
  { to: "/analytics", label: "Analytics", Icon: AnalysisIcon },
  { to: "/explore",   label: "Explore",   Icon: SearchLineIcon },
];

export default function HeaderNav() {
  const location = useLocation();
  
  const handleNavigation = (e: React.MouseEvent, to: string) => {
    if (location.pathname === "/upload") {
      const uploadPage = document.querySelector('[data-step="2"]');
      if (uploadPage) {
        e.preventDefault();
        if (confirm("Changes will not be saved")) {
          window.location.href = to;
        }
      }
    }
  };

  return (
    <header className="bg-white border-b border-ifrcRed/40">
      <div className="flex items-center justify-between px-2 sm:px-4 py-3 max-w-full overflow-hidden">

        {/* ── Logo + title ─────────────────────────── */}
        <NavLink to="/" className="flex items-center gap-2 min-w-0" onClick={(e) => handleNavigation(e, "/")}>
          <GoMainIcon className="h-6 w-6 flex-shrink-0 text-ifrcRed" />
          <span className="font-semibold text-sm sm:text-base truncate">PromptAid Vision</span>
        </NavLink>

        {/* ── Centre nav links ─────────────────────── */}
        <nav className="flex flex-wrap justify-center gap-6">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={navLink} onClick={(e) => handleNavigation(e, to)}>
              <Icon className="w-4 h-4" /> <span className="inline">{label}</span>
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
