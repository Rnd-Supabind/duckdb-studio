import { Database, FileSpreadsheet, Code, Settings, Upload, FolderOpen, Play, GitBranch, Shield, Sparkles, ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const navigation = [
  { name: 'Data View', href: '/', icon: FileSpreadsheet },
  { name: 'Query Editor', href: '/query', icon: Code },
  { name: 'Templates', href: '/templates', icon: FolderOpen },
  { name: 'Workflows', href: '/workflows', icon: Play },
  { name: 'AI Assistant', href: '/ai', icon: Sparkles },
];

const settings = [
  { name: 'Storage', href: '/settings/storage', icon: Database },
  { name: 'Security', href: '/settings/security', icon: Shield },
  { name: 'Versioning', href: '/settings/versioning', icon: GitBranch },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { user, logout } = useAuth();
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
      <div className={cn("p-4 border-b-2 border-border flex items-center", collapsed ? "justify-center" : "justify-between")}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 min-w-8 bg-primary flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap transition-opacity duration-300">
              <h1 className="font-bold text-lg tracking-tight">DataForge</h1>
              <p className="text-xs text-muted-foreground font-mono">ETL Platform</p>
            </div>
          )}
        </div>
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
        {navigation.map((item) => (
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

        {!collapsed && (
          <p className="text-xs font-bold text-muted-foreground mb-2 mt-6 px-2 uppercase tracking-wider transition-opacity duration-300">
            Settings
          </p>
        )}
        {collapsed && <div className="my-4 border-t border-border" />}

        {settings.map((item) => (
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
            <div className="bg-secondary border-2 border-border p-3 shadow-xs whitespace-nowrap">
              <p className="text-xs font-mono text-muted-foreground">DuckDB WASM</p>
              <p className="text-sm font-bold">Local Processing</p>
              <p className="text-xs text-muted-foreground mt-1">Data stays in browser</p>
            </div>

            {user && (
              <div className="bg-secondary border-2 border-border p-3 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="w-3 h-3" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="DuckDB Active" />
            </div>
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="w-full"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
