import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import { settingsNavigation, workspaceNavigation } from './navigation';
import { LogOut, Moon, PanelLeft, Sun, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AppTopNavProps {
  onSwitchLayout: () => void;
}

export function AppTopNav({ onSwitchLayout }: AppTopNavProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b-2 border-border bg-sidebar/80 backdrop-blur supports-[backdrop-filter]:bg-sidebar/70">
      <div className="flex flex-col gap-3 px-4 lg:px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center font-bold tracking-tight">
              DF
            </div>
            <div>
              <p className="font-semibold leading-tight">DataForge</p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
            </div>
          </div>
          <div className="flex-1 hidden lg:flex items-center gap-2 justify-center">
            {workspaceNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className="px-3 py-2 rounded-md text-sm font-medium transition-all border border-transparent hover:border-border hover:bg-accent"
                activeClassName="bg-primary text-primary-foreground border-border shadow-xs"
              >
                {item.name}
              </NavLink>
            ))}
            <div className="w-px h-6 bg-border mx-1" />
            {settingsNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className="px-3 py-2 rounded-md text-sm font-medium transition-all border border-transparent hover:border-border hover:bg-accent"
                activeClassName="bg-primary text-primary-foreground border-border shadow-xs"
              >
                {item.name}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              Theme
            </Button>
            <Button variant="outline" size="icon" onClick={onSwitchLayout} title="Switch to sidebar navigation">
              <PanelLeft className="w-4 h-4" />
            </Button>
            {user && (
              <>
                <Button variant="outline" size="icon" onClick={() => navigate('/profile')} title="Profile">
                  <User className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:hidden">
          {[...workspaceNavigation, ...settingsNavigation].map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className="px-3 py-2 rounded-md text-sm font-medium transition-all border border-border flex-1 text-center hover:bg-accent"
              activeClassName="bg-primary text-primary-foreground border-border shadow-xs"
            >
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}

