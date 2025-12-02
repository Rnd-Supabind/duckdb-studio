import { FormEvent, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Key, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

export default function ProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState(user?.email || '');
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            toast.error('New passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await apiClient.changePassword(passwords.current, passwords.new);
            toast.success('Password updated successfully');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            toast.error('Email cannot be empty');
            return;
        }
        setLoading(true);
        try {
            const updated = await apiClient.updateCurrentUser(email);
            localStorage.setItem('auth_user', JSON.stringify(updated));
            toast.success('Profile updated');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <User className="w-6 h-6" />
                User Profile
            </h1>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    <div className="p-6 border-2 border-border bg-card">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Account Details
                        </h2>
                        <form className="space-y-4" onSubmit={handleProfileUpdate}>
                            <div>
                                <Label>Username</Label>
                                <div className="p-2 bg-muted border border-input rounded-md font-mono">
                                    {user?.username}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="font-mono"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Role</Label>
                                <div className="p-2 bg-muted border border-input rounded-md font-mono capitalize">
                                    {user?.role || 'user'}
                                </div>
                            </div>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Profile'}
                            </Button>
                        </form>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-6 border-2 border-border bg-card">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            Change Password
                        </h2>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current">Current Password</Label>
                                <Input
                                    id="current"
                                    type="password"
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new">New Password</Label>
                                <Input
                                    id="new"
                                    type="password"
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm">Confirm New Password</Label>
                                <Input
                                    id="confirm"
                                    type="password"
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                    required
                                />
                            </div>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
