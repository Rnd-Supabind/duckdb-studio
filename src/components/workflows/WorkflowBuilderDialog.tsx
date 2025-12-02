import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkflowBuilder } from '@/components/workflows/WorkflowBuilder';

interface WorkflowBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId?: number;
  onWorkflowCreated?: () => void;
}

export function WorkflowBuilderDialog({
  open,
  onOpenChange,
  workflowId,
  onWorkflowCreated
}: WorkflowBuilderDialogProps) {
  const handleClose = () => {
    onWorkflowCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workflowId ? 'Edit Workflow' : 'Create New Workflow'}
          </DialogTitle>
          <DialogDescription>
            {workflowId 
              ? 'Modify your workflow configuration and save changes' 
              : 'Build a powerful workflow with SQL transformations, scheduling, and more'}
          </DialogDescription>
        </DialogHeader>
        <WorkflowBuilder 
          workflowId={workflowId}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}
