'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User as AppUser, Role, Branch } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';


const userSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.'),
  roleId: z.string().min(1, 'Role is required.'),
  status: z.enum(['active', 'suspended']),
  branchIds: z.array(z.string()).optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface EditUserDialogProps {
  user: AppUser;
  roles: Role[];
  branches: Branch[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, roles, branches, open, onOpenChange }: EditUserDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
        fullName: user.fullName,
        roleId: user.roleId,
        status: user.status,
        branchIds: user.branchIds || [],
    },
  });

  const onSubmit = (values: UserFormData) => {
    setIsSubmitting(true);
    const userDocRef = doc(firestore, 'users', user.id);
    
    updateDocumentNonBlocking(userDocRef, values)
      .then(() => {
        toast({ title: 'Success', description: 'User updated successfully.' });
        onOpenChange(false);
      })
      .catch(err => {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update user.' });
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update details for {user.email}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="roleId" render={({ field }) => (
              <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          {roles.map(role => (
                              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <FormMessage />
              </FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                  </Select>
                  <FormMessage />
              </FormItem>
              )}/>
            </div>
             <FormField
              control={form.control}
              name="branchIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Assigned Branches</FormLabel>
                    <FormDescription>
                      Select which branches this user belongs to.
                    </FormDescription>
                  </div>
                  <div className="space-y-2">
                  {branches.map((branch) => (
                    <FormField
                      key={branch.id}
                      control={form.control}
                      name="branchIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={branch.id}
                            className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(branch.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), branch.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== branch.id
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal w-full">
                              {branch.name} {branch.isMain && <span className="text-muted-foreground text-xs">(Main)</span>}
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
