'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Pusher from 'pusher-js';
import { useToast } from '@/hooks/use-toast';

export default function RealTimeListener() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Skip if keys are not set
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!pusherKey || !pusherCluster || pusherKey === 'YOUR_PUSHER_KEY') {
      console.warn("Pusher keys not configured. Real-time updates disabled.");
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    const channel = pusher.subscribe('repayments-channel');
    
    channel.bind('new-payment', (data: any) => {
      console.log("[Pusher] New payment received:", data);
      
      // Notify the user
      toast({
        title: "Payment Received! 💰",
        description: `${data.borrowerName} just paid KES ${data.amount}. The dashboard has been updated.`,
        duration: 5000,
      });

      // Refresh the route to show new data
      router.refresh();
    });

    return () => {
      pusher.unsubscribe('repayments-channel');
      pusher.disconnect();
    };
  }, [router, toast]);

  return null;
}
