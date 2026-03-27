'use client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getUsers } from '@/actions/users';
import type { User as AppUser, Branch } from '@/lib/types';
import { Loader2, User as UserIcon, Mail, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useUserProfile } from '@/providers/user-profile';

interface BranchUsersDialogProps {
  branch: Branch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BranchUsersDialog({ branch, open, onOpenChange }: BranchUsersDialogProps) {
  const { userProfile } = useUserProfile();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && branch && userProfile?.organizationId) {
      setIsLoading(true);
      getUsers(userProfile.organizationId, undefined, branch.id)
        .then(res => {
          if (res.success && res.users) {
            setUsers(res.users as any);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
        setUsers([]);
    }
  }, [open, branch, userProfile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Staff in {branch?.name}</DialogTitle>
          <DialogDescription>
            List of users assigned to the {branch?.name} branch.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] mt-4 pr-4">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p>Fetching branch staff...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <UserIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No staff members found for this branch.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {user.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold">{user.fullName}</h4>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        <Mail className="h-3 w-3 mr-1" />
                                        {user.email}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant={user.roleId === 'admin' ? 'default' : 'secondary'} className="capitalize text-[10px]">
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    {user.roleId}
                                </Badge>
                                <span className={`text-[10px] ${user.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                                    ● {user.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
