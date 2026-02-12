'use client';
import { PageHeader } from "@/components/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, MapPin } from "lucide-react";

const faqs = [
    {
        question: "How do I make a payment via M-Pesa?",
        answer: "Go to your M-Pesa menu and select 'Lipa na M-Pesa', then 'Pay Bill'. Enter Business Number: 4159879. For the Account Number, please enter your National ID number. Enter the amount you wish to pay and complete the transaction with your M-Pesa PIN."
    },
    {
        question: "What happens if I miss a payment?",
        answer: "If you miss a payment, your installment will be marked as 'Overdue'. A grace period of 7 days is provided. After the grace period, late payment penalties may apply according to your loan agreement. We recommend contacting your loan officer as soon as possible to discuss your situation."
    },
    {
        question: "Can I pay off my loan early?",
        answer: "Yes, you can pay off your loan early. There are no penalties for early repayment. Please contact us to get your final settlement amount."
    },
    {
        question: "How can I check my loan balance?",
        answer: "Your current loan balance, including the total outstanding amount, is always visible on your main dashboard. You can also see a detailed breakdown on the 'My Loans' page."
    },
    {
        question: "Who is my loan officer?",
        answer: "Your assigned loan officer is your primary point of contact for any questions or concerns about your loan. Their contact information can be found on your dashboard."
    }
]

export default function HelpCenterPage() {
    return (
        <div className="container max-w-5xl py-8">
            <PageHeader title="Help Center" description="Find answers to common questions." />

            <div className="mt-6 grid md:grid-cols-2 gap-8">
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Frequently Asked Questions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {faqs.map((faq, index) => (
                                    <AccordionItem value={`item-${index}`} key={index}>
                                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                                        <AccordionContent>
                                            {faq.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Us</CardTitle>
                            <CardDescription>If you can't find the answer you're looking for, please get in touch.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Phone className="h-5 w-5 text-primary" />
                                <div className="text-sm">
                                    <p className="font-medium">Phone Support</p>
                                    <a href="tel:0706624577" className="text-muted-foreground hover:underline">0706624577</a>, <a href="tel:0114611857" className="text-muted-foreground hover:underline">0114611857</a>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Mail className="h-5 w-5 text-primary" />
                                <div className="text-sm">
                                    <p className="font-medium">Email Support</p>
                                    <a href="mailto:BOSILIMITED254@gmail.com" className="text-muted-foreground hover:underline">BOSILIMITED254@gmail.com</a>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <MapPin className="h-5 w-5 text-primary mt-1" />
                                <div className="text-sm">
                                    <p className="font-medium">Physical Address</p>
                                    <p className="text-muted-foreground">Wayi Plaza B14, 7th Floor, along Galana Road, Kilimani, Nairobi</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
