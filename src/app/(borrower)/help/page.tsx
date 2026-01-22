'use client';
import { PageHeader } from "@/components/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

const faqs = [
    {
        question: "How do I make a payment?",
        answer: "You can make a payment through any of our supported methods, including mobile money (M-Pesa), bank transfer, or by visiting one of our branches. Please ensure you use your loan ID as the payment reference."
    },
    {
        question: "What happens if I miss a payment?",
        answer: "If you miss a payment, your installment will be marked as 'Overdue'. Late fees may apply according to the terms of your loan agreement. We recommend contacting your loan officer as soon as possible to discuss your situation."
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

            <Card className="mt-6">
                <CardContent className="pt-6">
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
    )
}
