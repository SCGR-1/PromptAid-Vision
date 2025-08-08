import { useLocation, useNavigate } from "react-router-dom";
import { Button, PageContainer } from "@ifrc-go/ui";
import {
  UploadCloudLineIcon,
  AnalysisIcon,
  SearchLineIcon,
  QuestionLineIcon,
  GoMainIcon,
  SettingsIcon,
} from "@ifrc-go/icons";

/* Put page info in one list so it's easy to extend */
const navItems = [
  { to: "/upload",    label: "Upload",    Icon: UploadCloudLineIcon },
  { to: "/explore",   label: "Explore",   Icon: SearchLineIcon },
  { to: "/analytics", label: "Analytics", Icon: AnalysisIcon },
  { to: "/dev",       label: "Dev",       Icon: SettingsIcon },
];

export default function HeaderNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <PageContainer
        className="border-b border-ifrcRed"
        contentClassName="flex items-center justify-between py-4"
      >
        {/* ── Logo + title ─────────────────────────── */}
        <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => navigate('/')}>
          <GoMainIcon className="h-8 w-8 flex-shrink-0 text-ifrcRed" />
          <span className="font-semibold text-lg truncate text-gray-900">PromptAid Vision</span>
        </div>

        {/* ── Centre nav links ─────────────────────── */}
        <nav className="flex items-center">
          {navItems.map(({ to, label, Icon }, index) => (
            <div key={to} className={index < navItems.length - 1 ? "mr-8" : ""}>
              <Button
                name={label.toLowerCase()}
                variant={location.pathname === to ? "primary" : "tertiary"}
                size={1}
                onClick={() => {
                  if (location.pathname === "/upload") {
                    const uploadPage = document.querySelector('[data-step="2"]');
                    if (uploadPage && !confirm("Changes will not be saved")) {
                      return;
                    }
                  }
                  navigate(to);
                }}
              >
                <Icon className="w-4 h-4" /> 
                <span className="inline ml-2 font-medium">{label}</span>
              </Button>
            </div>
          ))}
        </nav>

        {/* ── Right-side utility buttons ───────────── */}
        <Button
          name="help"
          variant="tertiary"
          size={1}
          onClick={() => navigate('/help')}
        >
          <QuestionLineIcon className="w-4 h-4" />
          <span className="inline ml-2 font-medium">Help & Support</span>
        </Button>
      </PageContainer>
    </nav>
  );
}
