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
import { useUserProfile } from '@/providers/user-profile';
import { createBorrower } from '@/actions/borrowers';
import { createUser } from '@/actions/users';
import { registerBorrower } from '@/actions/borrower-registration';
import { Loader2, AlertTriangle, Camera, Image as LucideImage, RefreshCcw, FileText, FileUp, Building2 } from 'lucide-react';
import { getBranches } from '@/actions/users';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import type { Borrower } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
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
  const { userProfile: staffProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [businessPhoto, setBusinessPhoto] = useState<string | null>(null);
  const [homeAssetsPhoto, setHomeAssetsPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<'business' | 'homeAssets' | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const [loanApplicationFile, setLoanApplicationFile] = useState<string | null>(null);
  const [guarantorFormFile, setGuarantorFormFile] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!isCameraOpen || !photoTarget) {
      stopCamera();
      return;
    }

    const startCamera = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            toast({ variant: 'destructive', title: 'Error', description: 'Camera not supported on this device.' });
            setIsCameraOpen(false);
            setPhotoTarget(null);
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: facingMode } 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions in your browser.' });
            setIsCameraOpen(false);
            setPhotoTarget(null);
        }
    };

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isCameraOpen, photoTarget, facingMode, toast]);

    useEffect(() => {
        if (open && staffProfile?.organizationId) {
            getBranches(staffProfile.organizationId, true).then(res => {
                if (res.success && res.branches) {
                    setBranches(res.branches);
                    // Match the default branch if staff is already assigned to one
                    if (staffProfile.branchIds?.[0]) {
                        setSelectedBranchId(staffProfile.branchIds[0]);
                    } else if (res.branches.length > 0) {
                        setSelectedBranchId(res.branches[0].id);
                    }
                }
            });
        }
    }, [open, staffProfile]);

  const handleEnableCamera = (target: 'business' | 'homeAssets') => {
    setPhotoTarget(target);
    setIsCameraOpen(true);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !photoTarget) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast({
            variant: "destructive",
            title: "Camera Not Ready",
            description: "The camera feed is not available yet. Please wait a moment and try again.",
        });
        return;
    }

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
        
        setIsCameraOpen(false);
        setPhotoTarget(null);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleCancelCapture = () => {
    setIsCameraOpen(false);
    setPhotoTarget(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'application' | 'guarantor') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload a PDF document.' });
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const base64 = reader.result as string;
        if (target === 'application') setLoanApplicationFile(base64);
        else setGuarantorFormFile(base64);
        toast({ title: 'File Uploaded', description: `${target === 'application' ? 'Loan application' : 'Guarantor form'} attached.` });
    };
    reader.readAsDataURL(file);
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

  // Reset local state when dialog closes
  useEffect(() => {
    if (!open) {
        setBusinessPhoto(null);
        setHomeAssetsPhoto(null);
        setLoanApplicationFile(null);
        setGuarantorFormFile(null);
    }
  }, [open]);

  const onSubmit = async (values: BorrowerFormData) => {
    if (!staffProfile || !staffProfile.branchIds?.[0]) {
        toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated or not assigned to a branch.' });
        return;
    }
    setIsSubmitting(true);
    
    try {
        const assignedBranchId = selectedBranchId || staffProfile.branchIds?.[0];

        if (!assignedBranchId) {
            throw new Error('Please select a branch for this borrower.');
        }

        // 1. Create User and Borrower in a single transaction
        const res = await registerBorrower({
            organizationId: staffProfile.organizationId,
            fullName: values.fullName,
            email: values.email,
            password: values.password,
            phone: values.phone,
            address: values.address,
            nationalId: values.nationalId,
            dateOfBirth: values.dateOfBirth,
            gender: values.gender,
            employmentStatus: values.employmentStatus,
            monthlyIncome: values.monthlyIncome,
            businessPhotoUrl: businessPhoto || '',
            homeAssetsPhotoUrl: homeAssetsPhoto || '',
            loanApplicationUrl: loanApplicationFile || '',
            guarantorFormUrl: guarantorFormFile || '',
            photoUrl: `https://picsum.photos/seed/${values.email}/400/400`,
            branchId: assignedBranchId,
        });

        if (!res.success) {
            throw new Error(res.error);
        }

        toast({ title: 'Success', description: 'Borrower account created successfully.' });
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        console.error("Error creating borrower account:", error);
        toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
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
                
                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label>Assign Branch</Label>
                        <Select onValueChange={setSelectedBranchId} value={selectedBranchId}>
                            <FormControl>
                                <SelectTrigger className="w-full">
                                    <div className="flex items-center">
                                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder="Select branch" />
                                    </div>
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {branches.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">Select the branch where this borrower will be managed.</p>
                    </div>

                    <div className="space-y-4">
                        <Label>Digital Documents (PDF)</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Loan Application Form</Label>
                                <div className="relative">
                                    <Input 
                                        type="file" 
                                        accept=".pdf" 
                                        className="hidden" 
                                        id="loan-app-upload" 
                                        onChange={(e) => handleFileUpload(e, 'application')}
                                    />
                                    <label 
                                        htmlFor="loan-app-upload" 
                                        className={`flex items-center justify-center w-full h-10 px-3 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${loanApplicationFile ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/20'}`}
                                    >
                                        {loanApplicationFile ? (
                                            <div className="flex items-center text-xs font-medium text-primary">
                                                <FileText className="mr-2 h-4 w-4" />
                                                Application Attached
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-xs text-muted-foreground">
                                                <FileUp className="mr-2 h-4 w-4" />
                                                Upload Application
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Guarantor Form</Label>
                                <div className="relative">
                                    <Input 
                                        type="file" 
                                        accept=".pdf" 
                                        className="hidden" 
                                        id="guarantor-form-upload" 
                                        onChange={(e) => handleFileUpload(e, 'guarantor')}
                                    />
                                    <label 
                                        htmlFor="guarantor-form-upload" 
                                        className={`flex items-center justify-center w-full h-10 px-3 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${guarantorFormFile ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/20'}`}
                                    >
                                        {guarantorFormFile ? (
                                            <div className="flex items-center text-xs font-medium text-primary">
                                                <FileText className="mr-2 h-4 w-4" />
                                                Guarantor Form Attached
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-xs text-muted-foreground">
                                                <FileUp className="mr-2 h-4 w-4" />
                                                Upload Guarantor Form
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Supporting Photos</Label>
                    <div className="p-4 border rounded-md bg-muted/50">
                        <div className="grid grid-cols-2 gap-4">
                             {/* Business Photo Box */}
                            <div className="space-y-2">
                                <Label className="text-xs">Business Photo</Label>
                                <div className="relative overflow-hidden aspect-video w-full rounded-md border flex items-center justify-center bg-background">
                                    {isCameraOpen && photoTarget === 'business' ? (
                                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                    ) : businessPhoto ? (
                                        <Image src={businessPhoto} alt="Business Preview" fill className="object-contain" />
                                    ) : (
                                        <LucideImage className="h-8 w-8 text-muted-foreground" />
                                    )}
                                </div>
                                {isCameraOpen && photoTarget === 'business' ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button type="button" size="sm" onClick={handleCapture}><Camera className="mr-2 h-4 w-4" />Capture</Button>
                                            <Button type="button" size="sm" variant="outline" onClick={handleCancelCapture}>Cancel</Button>
                                        </div>
                                        <Button type="button" size="sm" variant="secondary" className="w-full" onClick={toggleCamera}>
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                            Switch to {facingMode === 'user' ? 'Back' : 'Front'} Camera
                                        </Button>
                                    </div>
                                ) : (
                                    <Button type="button" variant="outline" className="w-full" onClick={() => handleEnableCamera('business')} disabled={isCameraOpen}>
                                        <Camera className="mr-2 h-4 w-4" />
                                        {businessPhoto ? 'Retake' : 'Take'} Photo
                                    </Button>
                                )}
                            </div>

                            {/* Home Assets Photo Box */}
                            <div className="space-y-2">
                                <Label className="text-xs">Home Assets Photo</Label>
                                <div className="relative overflow-hidden aspect-video w-full rounded-md border flex items-center justify-center bg-background">
                                    {isCameraOpen && photoTarget === 'homeAssets' ? (
                                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                    ) : homeAssetsPhoto ? (
                                        <Image src={homeAssetsPhoto} alt="Home Assets Preview" fill className="object-contain" />
                                    ) : (
                                        <LucideImage className="h-8 w-8 text-muted-foreground" />
                                    )}
                                </div>
                                {isCameraOpen && photoTarget === 'homeAssets' ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button type="button" size="sm" onClick={handleCapture}><Camera className="mr-2 h-4 w-4" />Capture</Button>
                                            <Button type="button" size="sm" variant="outline" onClick={handleCancelCapture}>Cancel</Button>
                                        </div>
                                        <Button type="button" size="sm" variant="secondary" className="w-full" onClick={toggleCamera}>
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                            Switch to {facingMode === 'user' ? 'Back' : 'Front'} Camera
                                        </Button>
                                    </div>
                                ) : (
                                    <Button type="button" variant="outline" className="w-full" onClick={() => handleEnableCamera('homeAssets')} disabled={isCameraOpen}>
                                        <Camera className="mr-2 h-4 w-4" />
                                        {homeAssetsPhoto ? 'Retake' : 'Take'} Photo
                                    </Button>
                                )}
                            </div>
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                </div>

                <DialogFooter className="sticky bottom-0 bg-background pt-4 pb-0 -mb-6">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
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
