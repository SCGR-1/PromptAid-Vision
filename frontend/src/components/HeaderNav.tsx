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
    <nav className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <PageContainer
        className="border-b-2 border-ifrcRed"
        contentClassName="flex items-center justify-between py-6"
      >
        <div 
          className="flex items-center gap-4 min-w-0 cursor-pointer group transition-all duration-200 hover:scale-105" 
          onClick={() => navigate('/')}
        >
          <div className="p-2 rounded-lg bg-gradient-to-br from-ifrcRed/10 to-ifrcRed/20 group-hover:from-ifrcRed/20 group-hover:to-ifrcRed/30 transition-all duration-200">
            <GoMainIcon className="h-8 w-8 flex-shrink-0 text-ifrcRed" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl text-gray-900 leading-tight">PromptAid Vision</span>
            <span className="text-sm text-gray-500 font-medium">AI-Powered Image Analysis</span>
          </div>
        </div>

        <nav className="flex items-center space-x-2 bg-gray-50/80 rounded-xl p-2 backdrop-blur-sm">
          {navItems.map(({ to, label, Icon }) => {
            const isActive = location.pathname === to;
            return (
              <div key={to} className="relative">
                <Button
                  name={label.toLowerCase()}
                  variant={isActive ? "primary" : "tertiary"}
                  size={1}
                  className={`transition-all duration-200 ${
                    isActive 
                      ? 'shadow-lg shadow-ifrcRed/20 transform scale-105' 
                      : 'hover:bg-white hover:shadow-md hover:scale-105'
                  }`}
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
                  <Icon className={`w-4 h-4 transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'group-hover:scale-110'
                  }`} /> 
                  <span className="inline ml-2 font-semibold">{label}</span>
                </Button>
                {isActive && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-ifrcRed rounded-full animate-pulse"></div>
                )}
              </div>
            );
          })}
        </nav>

        <Button
          name="help"
          variant="tertiary"
          size={1}
          className="transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md hover:scale-105"
          onClick={() => navigate('/help')}
        >
          <QuestionLineIcon className="w-4 h-4" />
          <span className="inline ml-2 font-semibold">Help & Support</span>
        </Button>
      </PageContainer>
    </nav>
  );
}
