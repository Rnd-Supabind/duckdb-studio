import { Database, FileSpreadsheet, Code, Settings, Upload, FolderOpen, Play, GitBranch, Shield, Sparkles } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';

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

export function AppSidebar() {
  return (
    <aside className="w-64 border-r-2 border-border bg-sidebar flex flex-col h-screen">
      <div className="p-4 border-b-2 border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center">
            <Database className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">DataForge</h1>
            <p className="text-xs text-muted-foreground font-mono">ETL Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Workspace</p>
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium border-2 border-transparent transition-all",
              "hover:bg-accent hover:border-border hover:shadow-xs"
            )}
            activeClassName="bg-primary text-primary-foreground border-border shadow-xs"
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </NavLink>
        ))}

        <p className="text-xs font-bold text-muted-foreground mb-3 mt-6 uppercase tracking-wider">Settings</p>
        {settings.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium border-2 border-transparent transition-all",
              "hover:bg-accent hover:border-border hover:shadow-xs"
            )}
            activeClassName="bg-primary text-primary-foreground border-border shadow-xs"
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t-2 border-border">
        <div className="bg-secondary border-2 border-border p-3 shadow-xs">
          <p className="text-xs font-mono text-muted-foreground">DuckDB WASM</p>
          <p className="text-sm font-bold">Local Processing</p>
          <p className="text-xs text-muted-foreground mt-1">Data stays in browser</p>
        </div>
      </div>
    </aside>
  );
}
