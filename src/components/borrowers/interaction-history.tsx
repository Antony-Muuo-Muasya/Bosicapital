'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useUserProfile, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';

type Interaction = {
    id: string;
    borrowerId: string;
    organizationId: string;
    branchId: string;
    recordedById: string;
    recordedByName: string;
    timestamp: string; // ISO date-time string
    notes: string;
};

interface InteractionHistoryProps {
  borrowerId: string;
}

const interactionSchema = z.object({
  notes: z.string().min(5, 'Interaction notes must be at least 5 characters long.'),
});

type InteractionFormData = z.infer<typeof interactionSchema>;

export function InteractionHistory({ borrowerId }: InteractionHistoryProps) {
  const firestore = useFirestore();
  const { user, userProfile } = useUserProfile();
  const { toast } = useToast();

  const interactionsQuery = useMemoFirebase(() => {
    if (!firestore || !borrowerId) return null;
    return query(collection(firestore, 'borrowers', borrowerId, 'interactions'), orderBy('timestamp', 'desc'));
  }, [firestore, borrowerId]);

  const { data: interactions, isLoading: isLoadingInteractions } = useCollection<Interaction>(interactionsQuery);

  const form = useForm<InteractionFormData>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      notes: '',
    },
  });

  const { isSubmitting } = form.formState;

  const canAddInteraction = userProfile?.roleId === 'loan_officer' || userProfile?.roleId === 'manager';

  const onSubmit = async (values: InteractionFormData) => {
    if (!user || !userProfile || !firestore || !userProfile.branchIds?.[0]) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot add interaction. User profile is incomplete.' });
      return;
    }

    const interactionsColRef = collection(firestore, 'borrowers', borrowerId, 'interactions');
    const newInteractionData = {
      borrowerId,
      organizationId: userProfile.organizationId,
      branchId: userProfile.branchIds[0],
      recordedById: user.uid,
      recordedByName: userProfile.fullName,
      timestamp: new Date().toISOString(),
      notes: values.notes,
    };

    // We don't await this so the UI is not blocked
    addDocumentNonBlocking(interactionsColRef, newInteractionData)
      .then(() => {
        toast({ title: 'Success', description: 'Interaction logged successfully.' });
        form.reset();
      })
      .catch((err) => {
        // The non-blocking function will emit a detailed error, so we just show a generic toast.
        console.error("Error logging interaction:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to log interaction. Check permissions.' });
      });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interaction History</CardTitle>
        <CardDescription>A log of all follow-ups and notes for this borrower.</CardDescription>
      </CardHeader>
      <CardContent>
        {canAddInteraction && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add a new note</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Called customer, confirmed they will pay tomorrow..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Interaction
              </Button>
            </form>
          </Form>
        )}

        <ScrollArea className="h-72 pr-4">
          <div className="space-y-6">
            {isLoadingInteractions && <p className="text-muted-foreground">Loading history...</p>}
            {!isLoadingInteractions && interactions?.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No interactions have been logged yet.</p>
            )}
            {!isLoadingInteractions && interactions?.map((interaction) => (
              <div key={interaction.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{interaction.recordedByName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-sm">{interaction.recordedByName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(interaction.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{interaction.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
