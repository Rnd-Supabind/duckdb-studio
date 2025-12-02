import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Users, ShieldCheck, Activity, LogIn, CreditCard, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    plan_name?: string;
    storage_used_bytes?: number;
    storage_limit_gb?: number;
}

interface Plan {
    id: number;
    name: string;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { token, login, setAuthToken } = useAuth(); // login needed for impersonation (token swap)

    // Dialog states
    const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [billingCycle, setBillingCycle] = useState<string>('monthly');

    useEffect(() => {
        fetchUsers();
        fetchPlans();
    }, [search]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const endpoint = search ? `/admin/users/?search=${search}` : '/admin/users/';
            const data = await api.get(endpoint);
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const data = await api.get('/admin/plans/');
            setPlans(data);
        } catch (error) {
            console.error('Failed to fetch plans:', error);
        }
    };

    const toggleUserStatus = async (userId: number, isActive: boolean) => {
        try {
            await api.put(`/users/${userId}/status`, { is_active: !isActive });
            toast.success(`User ${isActive ? 'deactivated' : 'activated'} successfully`);
            fetchUsers();
        } catch (error) {
            console.error('Failed to update user status:', error);
            toast.error("Failed to update status");
        }
    };

    const handleImpersonate = async (user: User) => {
        if (!confirm(`Are you sure you want to impersonate ${user.username}?`)) return;

        try {
            const data = await api.post(`/admin/users/${user.id}/impersonate`, {});

            // Use setAuthToken to update context immediately
            await setAuthToken(data.access_token);

            toast.success(`Impersonating ${user.username}`);
            // Navigate to dashboard
            window.location.href = '/';

        } catch (error) {
            console.error('Impersonation failed:', error);
            toast.error("Impersonation failed");
        }
    };

    const openPlanDialog = (user: User) => {
        setSelectedUser(user);
        setSelectedPlanId(''); // Reset or find current plan ID if possible
        setIsPlanDialogOpen(true);
    };

    const handleAssignPlan = async () => {
        if (!selectedUser || !selectedPlanId) return;

        try {
            await api.post('/admin/subscriptions/', {
                user_id: selectedUser.id,
                plan_id: parseInt(selectedPlanId),
                billing_cycle: billingCycle
            });

            toast.success(`Plan assigned to ${selectedUser.username}`);
            setIsPlanDialogOpen(false);
            fetchUsers();
        } catch (error) {
            console.error('Failed to assign plan:', error);
            toast.error("Failed to assign plan");
        }
    };

    const formatBytes = (bytes?: number) => {
        if (bytes === undefined) return '0 B';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading && users.length === 0) {
        return <div className="p-8">Loading...</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Users className="w-8 h-8" />
                    <h1 className="text-3xl font-bold">User Management</h1>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="bg-card rounded-lg border">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-4 py-3 text-left">User</th>
                                <th className="px-4 py-3 text-left">Role</th>
                                <th className="px-4 py-3 text-left">Plan</th>
                                <th className="px-4 py-3 text-left">Storage</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Created</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-t hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{user.username}</div>
                                        <div className="text-sm text-muted-foreground">{user.email}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {user.role === 'admin' && <ShieldCheck className="w-4 h-4 text-primary" />}
                                            <span className={user.role === 'admin' ? 'text-primary font-semibold' : ''}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                                            {user.plan_name || 'Free'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {formatBytes(user.storage_used_bytes)} / {user.storage_limit_gb} GB
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openPlanDialog(user)}
                                                title="Change Plan"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleImpersonate(user)}
                                                title="Impersonate User"
                                                disabled={user.role === 'admin'} // Prevent impersonating other admins for safety
                                            >
                                                <LogIn className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant={user.is_active ? "destructive" : "default"}
                                                size="sm"
                                                onClick={() => toggleUserStatus(user.id, user.is_active)}
                                            >
                                                {user.is_active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Plan to {selectedUser?.username}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Select Plan</Label>
                            <Select onValueChange={setSelectedPlanId} value={selectedPlanId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.id.toString()}>
                                            {plan.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Billing Cycle</Label>
                            <Select onValueChange={setBillingCycle} value={billingCycle}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAssignPlan}>Assign Plan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
