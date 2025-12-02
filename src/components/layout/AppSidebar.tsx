import { ChevronLeft, ChevronRight, LogOut, PanelTop, User, Sun, Moon, Database, FileText, Workflow, Settings, LayoutGrid, Sparkles, Cloud, Monitor, Shield } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useExecutionMode } from '@/contexts/ExecutionModeContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { settingsNavigation, workspaceNavigation, adminMenuItems } from './navigation';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onSwitchLayout: () => void;
}

export function AppSidebar({ collapsed, onToggle, onSwitchLayout }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const { mode, setMode, isClientMode } = useExecutionMode();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        "border-r-2 border-border bg-sidebar flex flex-col h-screen transition-all duration-300 ease-in-out relative",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className={cn("p-4 border-b-2 border-border flex items-center gap-3", collapsed ? "justify-center" : "justify-between")}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 min-w-8 bg-primary flex items-center justify-center shrink-0">
            <span className="font-bold text-primary-foreground text-base">DF</span>
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap transition-opacity duration-300">
              <h1 className="font-bold text-lg tracking-tight">DataForge</h1>
              <p className="text-xs text-muted-foreground font-mono">ETL Platform</p>
            </div>
          )}
        </div>
        {!collapsed ? (
          <Button variant="outline" size="sm" className="shrink-0" onClick={onSwitchLayout}>
            Top Nav
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border border-border h-8 w-8"
            onClick={onSwitchLayout}
            title="Switch to top navigation"
          >
            <PanelTop className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-6 h-6 w-6 rounded-full border-2 border-border bg-background shadow-xs z-10 hover:bg-accent"
        onClick={onToggle}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <nav className="flex-1 p-2 space-y-1 overflow-x-hidden">
        {!collapsed && (
          <p className="text-xs font-bold text-muted-foreground mb-2 px-2 uppercase tracking-wider transition-opacity duration-300">
            Workspace
          </p>
        )}
        {workspaceNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium border-2 border-transparent transition-all rounded-md",
              "hover:bg-accent hover:border-border hover:shadow-xs",
              collapsed && "justify-center px-2"
            )}
            activeClassName="bg-primary text-primary-foreground border-border shadow-xs"
            title={collapsed ? item.name : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{item.name}</span>}
          </NavLink>
        ))}

        {/* Admin Section */}
        {user?.role === 'admin' && (
          <>
            {!collapsed && (
              <p className="text-xs font-bold text-muted-foreground mb-2 mt-6 px-2 uppercase tracking-wider transition-opacity duration-300 border-t border-border pt-4">
                <span className="flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              </p>
            )}
            {collapsed && <div className="my-4 border-t border-border" />}
            {adminMenuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium border-2 border-transparent transition-all rounded-md",
                  "hover:bg-accent hover:border-border hover:shadow-xs",
                  collapsed && "justify-center px-2"
                )}
                activeClassName="bg-primary text-primary-foreground border-border shadow-xs"
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.name}</span>}
              </NavLink>
            ))}
          </>
        )}

        {!collapsed && (
          <p className="text-xs font-bold text-muted-foreground mb-2 mt-6 px-2 uppercase tracking-wider transition-opacity duration-300">
            Settings
          </p>
        )}
        {collapsed && <div className="my-4 border-t border-border" />}

        {settingsNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium border-2 border-transparent transition-all rounded-md",
              "hover:bg-accent hover:border-border hover:shadow-xs",
              collapsed && "justify-center px-2"
            )}
            activeClassName="bg-primary text-primary-foreground border-border shadow-xs"
            title={collapsed ? item.name : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t-2 border-border overflow-hidden">
        {!collapsed ? (
          <div className="space-y-3">
            <div
              className={cn(
                "border-2 p-3 shadow-xs cursor-pointer transition-all hover:shadow-md",
                isClientMode
                  ? "bg-blue-500/10 border-blue-500"
                  : "bg-green-500/10 border-green-500"
              )}
              onClick={() => setMode(isClientMode ? 'server' : 'client')}
            >
              <div className="flex items-center gap-2 mb-1">
                {isClientMode ? (
                  <Monitor className="w-4 h-4 text-blue-500" />
                ) : (
                  <Cloud className="w-4 h-4 text-green-500" />
                )}
                <p className="text-xs font-mono text-muted-foreground">Execution Mode</p>
              </div>
              <p className="text-sm font-bold">
                {isClientMode ? 'Client (WASM)' : 'Server (Backend)'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isClientMode ? 'Data stays in browser' : 'Run on backend server'}
              </p>
              <p className="text-xs mt-2 text-blue-500 hover:text-blue-600">
                Click to switch →
              </p>
            </div>

            {user && (
              <div className="bg-secondary border-2 border-border p-3 shadow-xs">
                <div
                  className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate('/profile')}
                >
                  <User className="w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={toggleTheme}
                    title="Toggle Theme"
                  >
                    {theme === 'dark' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                    Theme
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={handleLogout}
                    title="Logout"
                  >
                    <LogOut className="w-3 h-3" />
                    Logout
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={() => setMode(isClientMode ? 'server' : 'client')}
              title={isClientMode ? 'Switch to Server Mode' : 'Switch to Client Mode'}
            >
              {isClientMode ? (
                <Monitor className="w-4 h-4 text-blue-500" />
              ) : (
                <Cloud className="w-4 h-4 text-green-500" />
              )}
            </Button>
            <div className="flex justify-center">
              <div
                className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  isClientMode ? "bg-blue-500" : "bg-green-500"
                )}
                title={isClientMode ? "Client Mode Active" : "Server Mode Active"}
              />
            </div>
            {user && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full"
                  onClick={toggleTheme}
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full"
                  onClick={() => navigate('/profile')}
                  title="Profile"
                >
                  <User className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
