import { Database, FileText, Workflow, Settings, BarChart3, Shield, GitBranch, FolderOpen, LayoutDashboard, Plug, FileJson, Code2, TableProperties, Save, Users, Activity, Cog, CreditCard } from 'lucide-react';

export type NavigationItem = {
  name: string;
  href: string;
  icon: typeof FileText;
  adminOnly?: boolean;
};

export const workspaceNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Files', href: '/files', icon: FolderOpen },
  { name: 'Transformed Data', href: '/transformed', icon: FileJson },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'API Access', href: '/developer', icon: Code2 },
  { name: 'Integrations', href: '/integrations', icon: Plug },
];

export const settingsNavigation: NavigationItem[] = [
  { name: 'Storage', href: '/settings/storage', icon: Database },
  { name: 'Security', href: '/settings/security', icon: Shield },
  { name: 'Extensions', href: '/settings/extensions', icon: GitBranch },
  { name: 'Versioning', href: '/settings/versioning', icon: GitBranch },
];

export const adminMenuItems: NavigationItem[] = [
  { name: 'User Management', href: '/admin/users', icon: Users, adminOnly: true },
  { name: 'Plans & Billing', href: '/admin/plans', icon: CreditCard, adminOnly: true },
  { name: 'Audit Logs', href: '/admin/audit', icon: Activity, adminOnly: true },
  { name: 'System Settings', href: '/admin/system', icon: Cog, adminOnly: true },
];
