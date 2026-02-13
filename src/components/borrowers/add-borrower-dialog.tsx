'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore, useUserProfile } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Loader2, AlertTriangle, Camera, Image as LucideImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import type { User as AppUser, Borrower } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Label } from '../ui/label';


const borrowerSchema = z.object({
    fullName: z.string().min(1, 'Full name is required.'),
    email: z.string().email('Invalid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    phone: z.string().min(1, 'Phone number is required.'),
    address: z.string().min(1, 'Address is required.'),
    nationalId: z.string().min(1, 'National ID is required.'),
    dateOfBirth: z.string().refine((val) => new Date(val).toString() !== 'Invalid Date', { message: 'A valid date of birth is required.'}),
    gender: z.enum(['Male', 'Female', 'Other']),
    employmentStatus: z.enum(['Employed', 'Self-employed', 'Unemployed']),
    monthlyIncome: z.coerce.number().min(0, 'Monthly income must be a positive number.'),
});

type BorrowerFormData = z.infer<typeof borrowerSchema>;

interface AddBorrowerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBorrowerDialog({ open, onOpenChange }: AddBorrowerDialogProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { userProfile: staffProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [businessPhoto, setBusinessPhoto] = useState<string | null>(null);
  const [homeAssetsPhoto, setHomeAssetsPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<'business' | 'homeAssets' | null>(null);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    // Cleanup function to stop camera when dialog is closed or component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  const handleEnableCamera = async (target: 'business' | 'homeAssets') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ variant: 'destructive', title: 'Error', description: 'Camera not supported on this device.' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPhotoTarget(target);
      setIsCameraOpen(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions in your browser.' });
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !photoTarget) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        if (photoTarget === 'business') {
            setBusinessPhoto(dataUrl);
        } else {
            setHomeAssetsPhoto(dataUrl);
        }
        toast({ title: 'Success', description: `${photoTarget === 'business' ? 'Business' : 'Home assets'} photo captured.` });
        
        // Stop camera and close view
        stopCamera();
        setIsCameraOpen(false);
        setPhotoTarget(null);
    }
  };

  const handleCancelCapture = () => {
    stopCamera();
    setIsCameraOpen(false);
    setPhotoTarget(null);
  };

  const form = useForm<BorrowerFormData>({
    resolver: zodResolver(borrowerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      nationalId: '',
      dateOfBirth: '',
      gender: 'Male',
      employmentStatus: 'Employed',
      monthlyIncome: 0,
    },
  });

  const onSubmit = async (values: BorrowerFormData) => {
    if (!staffProfile || !firestore || !staffProfile.branchIds?.[0]) {
        toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated, not assigned to a branch, or database not available.' });
        return;
    }
    setIsSubmitting(true);

    try {
        // In a real app, these base64 images should be uploaded to Firebase Storage first,
        // and the storage URLs should be saved in Firestore. For this prototype, we save the data URIs directly.
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        await updateProfile(userCredential.user, { displayName: values.fullName });

        const newUserId = userCredential.user.uid;
        const createdAt = new Date().toISOString();
        const assignedBranchId = staffProfile.branchIds[0];

        const batch = writeBatch(firestore);

        const userDocRef = doc(firestore, 'users', newUserId);
        const newUserProfile: AppUser = {
            id: newUserId,
            organizationId: staffProfile.organizationId,
            fullName: values.fullName,
            email: values.email,
            roleId: 'user',
            branchIds: [assignedBranchId],
            status: 'active',
            createdAt: createdAt,
        };
        batch.set(userDocRef, newUserProfile);

        const newBorrowerRef = doc(collection(firestore, 'borrowers'));
        const newBorrowerData: Borrower = {
            id: newBorrowerRef.id,
            userId: newUserId,
            email: values.email,
            fullName: values.fullName,
            phone: values.phone,
            address: values.address,
            nationalId: values.nationalId,
            dateOfBirth: values.dateOfBirth,
            gender: values.gender,
            employmentStatus: values.employmentStatus,
            monthlyIncome: values.monthlyIncome,
            businessPhotoUrl: businessPhoto || '',
            homeAssetsPhotoUrl: homeAssetsPhoto || '',
            photoUrl: `https://picsum.photos/seed/${newBorrowerRef.id}/400/400`,
            branchId: assignedBranchId,
            organizationId: staffProfile.organizationId,
            registrationFeeRequired: true,
            registrationFeeAmount: 800,
            registrationFeePaid: false,
            registrationFeePaidAt: null,
            registrationPaymentId: null,
        };
        batch.set(newBorrowerRef, newBorrowerData);

        await batch.commit();

        toast({ title: 'Success', description: 'Borrower account created successfully.' });
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        let description = 'An unexpected error occurred. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            description = 'This email address is already in use by another account.';
        }
        console.error("Error creating borrower account:", error);
        toast({ variant: 'destructive', title: 'Creation Failed', description });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancelCapture(); onOpenChange(isOpen); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Borrower</DialogTitle>
          <DialogDescription>
            Create a new borrower account. This will also create a user login for them.
          </DialogDescription>
        </DialogHeader>
        {!staffProfile?.branchIds?.length && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Branch Assignment Required</AlertTitle>
                <AlertDescription>
                You must be assigned to a branch before you can add a borrower. Please contact an administrator.
                </AlertDescription>
            </Alert>
        )}
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input type="email" placeholder="jane.doe@example.com" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Temporary Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl><Input placeholder="07..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="nationalId" render={({ field }) => (
                        <FormItem>
                            <FormLabel>National ID</FormLabel>
                            <FormControl><Input placeholder="ID Number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl><Input placeholder="123 Main St, Anytown" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                     <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="employmentStatus" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Employment Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Employed">Employed</SelectItem>
                                    <SelectItem value="Self-employed">Self-employed</SelectItem>
                                    <SelectItem value="Unemployed">Unemployed</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="monthlyIncome" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Monthly Income (KES)</FormLabel>
                            <FormControl><Input type="number" placeholder="25000" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                
                <div className="space-y-2">
                    <Label>Supporting Photos</Label>
                    <div className="p-4 border rounded-md bg-muted/50">
                        {isCameraOpen ? (
                            <div className="space-y-4">
                                <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
                                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button type="button" onClick={handleCapture}>
                                        <Camera className="mr-2" />
                                        Capture
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleCancelCapture}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Business Photo</Label>
                                    <div className="relative overflow-hidden aspect-video w-full rounded-md border flex items-center justify-center bg-background">
                                        {businessPhoto ? (
                                            <Image src={businessPhoto} alt="Business Preview" fill style={{ objectFit: 'contain' }} />
                                        ) : (
                                            <LucideImage className="h-8 w-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <Button type="button" variant="outline" className="w-full" onClick={() => handleEnableCamera('business')}>
                                        <Camera className="mr-2" />
                                        {businessPhoto ? 'Retake' : 'Take'} Photo
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Home Assets Photo</Label>
                                    <div className="relative overflow-hidden aspect-video w-full rounded-md border flex items-center justify-center bg-background">
                                        {homeAssetsPhoto ? (
                                            <Image src={homeAssetsPhoto} alt="Home Assets Preview" fill style={{ objectFit: 'contain' }} />
                                        ) : (
                                            <LucideImage className="h-8 w-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <Button type="button" variant="outline" className="w-full" onClick={() => handleEnableCamera('homeAssets')}>
                                        <Camera className="mr-2" />
                                        {homeAssetsPhoto ? 'Retake' : 'Take'} Photo
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="sticky bottom-0 bg-background pt-4 pb-0 -mb-6">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting || !staffProfile?.branchIds?.length}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Borrower
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
