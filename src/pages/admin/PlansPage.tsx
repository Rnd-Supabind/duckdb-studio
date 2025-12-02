import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Plan {
    id: number;
    name: string;
    plan_type: 'free' | 'pro' | 'enterprise';
    price_monthly: number;
    price_yearly: number;
    storage_gb: number;
    max_workflows: number;
    max_templates: number;
    max_transformations_per_month: number;
    max_files: number;
    is_active: boolean;
}

export function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        plan_type: 'free',
        price_monthly: 0,
        price_yearly: 0,
        storage_gb: 1,
        max_workflows: 5,
        max_templates: 10,
        max_transformations_per_month: 100,
        max_files: 50,
        is_active: true
    });

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const data = await api.get('/admin/plans/');
            setPlans(data);
        } catch (error) {
            toast.error("Failed to fetch plans");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleOpenDialog = (plan?: Plan) => {
        if (plan) {
            setEditingPlan(plan);
            setFormData({
                name: plan.name,
                plan_type: plan.plan_type,
                price_monthly: plan.price_monthly,
                price_yearly: plan.price_yearly,
                storage_gb: plan.storage_gb,
                max_workflows: plan.max_workflows,
                max_templates: plan.max_templates,
                max_transformations_per_month: plan.max_transformations_per_month || 100,
                max_files: plan.max_files,
                is_active: plan.is_active
            });
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                plan_type: 'free',
                price_monthly: 0,
                price_yearly: 0,
                storage_gb: 1,
                max_workflows: 5,
                max_templates: 10,
                max_transformations_per_month: 100,
                max_files: 50,
                is_active: true
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (editingPlan) {
                await api.put(`/admin/plans/${editingPlan.id}`, formData);
                toast.success("Plan updated successfully");
            } else {
                await api.post('/admin/plans/', formData);
                toast.success("Plan created successfully");
            }
            setIsDialogOpen(false);
            fetchPlans();
        } catch (error) {
            toast.error("Failed to save plan");
            console.error(error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this plan?")) return;

        try {
            await api.delete(`/admin/plans/${id}`);
            toast.success("Plan deleted successfully");
            fetchPlans();
        } catch (error) {
            toast.error("Failed to delete plan. It may have active subscriptions.");
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Billing Plans</h1>
                    <p className="text-muted-foreground">Manage subscription plans and limits.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Plan
                </Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Price (Mo/Yr)</TableHead>
                            <TableHead>Storage</TableHead>
                            <TableHead>Workflows</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {plans.map((plan) => (
                            <TableRow key={plan.id}>
                                <TableCell className="font-medium">{plan.name}</TableCell>
                                <TableCell className="capitalize">{plan.plan_type}</TableCell>
                                <TableCell>${plan.price_monthly} / ${plan.price_yearly}</TableCell>
                                <TableCell>{plan.storage_gb} GB</TableCell>
                                <TableCell>{plan.max_workflows === -1 ? 'Unlimited' : plan.max_workflows}</TableCell>
                                <TableCell>
                                    {plan.is_active ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            Inactive
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(plan)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(plan.id)}>
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Plan Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Pro Plan"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Plan Type</Label>
                            <Select
                                value={formData.plan_type}
                                onValueChange={(v) => setFormData({ ...formData, plan_type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Monthly Price ($)</Label>
                            <Input
                                type="number"
                                value={formData.price_monthly}
                                onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Yearly Price ($)</Label>
                            <Input
                                type="number"
                                value={formData.price_yearly}
                                onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) })}
                            />
                        </div>

                        <div className="col-span-2 border-t pt-4 mt-2">
                            <h3 className="font-semibold mb-4">Limits (-1 for unlimited)</h3>
                        </div>

                        <div className="space-y-2">
                            <Label>Storage (GB)</Label>
                            <Input
                                type="number"
                                value={formData.storage_gb}
                                onChange={(e) => setFormData({ ...formData, storage_gb: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Max Workflows</Label>
                            <Input
                                type="number"
                                value={formData.max_workflows}
                                onChange={(e) => setFormData({ ...formData, max_workflows: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Max Templates</Label>
                            <Input
                                type="number"
                                value={formData.max_templates}
                                onChange={(e) => setFormData({ ...formData, max_templates: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Max Files</Label>
                            <Input
                                type="number"
                                value={formData.max_files}
                                onChange={(e) => setFormData({ ...formData, max_files: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-4">
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <Label>Active Plan</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>Save Plan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
