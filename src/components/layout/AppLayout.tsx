import { ReactNode, useEffect, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppTopNav } from './AppTopNav';

interface AppLayoutProps {
  children: ReactNode;
}

type LayoutMode = 'sidebar' | 'top';

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') {
      return 'sidebar';
    }
    const stored = window.localStorage.getItem('app-layout-mode') as LayoutMode | null;
    return stored === 'top' ? 'top' : 'sidebar';
  });

  useEffect(() => {
    window.localStorage.setItem('app-layout-mode', layoutMode);
  }, [layoutMode]);

  if (layoutMode === 'top') {
    return (
      <div className="flex flex-col h-screen bg-background">
        <AppTopNav onSwitchLayout={() => setLayoutMode('sidebar')} />
        <main className="flex-1 overflow-auto transition-all duration-300 ease-in-out">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSwitchLayout={() => setLayoutMode('top')}
      />
      <main className="flex-1 overflow-auto transition-all duration-300 ease-in-out">
        {children}
      </main>
    </div>
  );
}
