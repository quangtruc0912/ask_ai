'use client';

import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, MoveRight, PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// type TestData = {
//   sessionUrl: string;
//   cardNumbers: {
//     success: string;
//     decline: string;
//   };
//   expiryDate: string;
//   cvc: string;
// };

// Test card data
// const TEST_CARDS = {
//   success: '4242 4242 4242 4242',
//   decline: '4000 0000 0000 0002',
//   expiry: 'Any future date',
//   cvc: 'Any 3 digits'
// };

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  // const [isLoading, setIsLoading] = useState(false);
  // const [showTestInfo, setShowTestInfo] = useState(false);
  // const [testData, setTestData] = useState<TestData | null>(null);
  // const [copiedText, setCopiedText] = useState('');
  const [subscription, setSubscription] = useState<{
    isActive: boolean;
    expiresAt: Date | null;
  } | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (user?.email) {
        try {
          const idToken = await user.getIdToken();
          const response = await fetch('/api/check-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              email: user.email,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setSubscription(data);
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
        }
      }
    };

    checkSubscription();
  }, [user]);

  // const handleProSubscription = async () => {
  //   try {
  //     // setIsLoading(true);
  //     const idToken = await user?.getIdToken();
  //     const response = await fetch('/api/create-subscription', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${idToken}`, // Add the Firebase ID token
  //       },
  //       body: JSON.stringify({
  //         email: user?.email,
  //       }),
  //     });

  //     const data = await response.json();
  //     if (data.error) throw new Error(data.error);

  //     // Store test data and show test info modal
  //     if (data.testData) {
  //       setTestData(data.testData);
  //       setShowTestInfo(true);
  //       return;
  //     }

  //     // Redirect to Stripe Checkout if no test data
  //     window.location.href = data.sessionUrl;
  //   } catch (error) {
  //     console.error('Error:', error);
  //     alert('Something went wrong. Please try again.');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const formatExpiryDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleFreeSignUp = () => {
    router.push('/signup');
  };

  // const proceedToPayment = () => {
  //   setShowTestInfo(false);
  //   if (testData) {
  //     window.location.href = testData.sessionUrl;
  //   }
  // };

  // const copyToClipboard = (text: string, label: string) => {
  //   navigator.clipboard.writeText(text);
  //   setCopiedText(label);
  //   setTimeout(() => setCopiedText(''), 2000);
  // };

  return (
    <div className="w-full py-20 lg:py-40 min-h-screen">
      <div className="container mx-auto">

        <div className="flex text-center justify-center items-center gap-4 flex-col">
        <img src="/logo.png" alt="Askits Logo" className="h-32 w-auto mb-4" />
          <Badge>Pricing</Badge>
          <div className="flex gap-2 flex-col">
            <h2 className="text-3xl md:text-5xl tracking-tighter max-w-xl text-center font-regular">
              Simple, Flexible Pricing for Everyone
            </h2>
            <p className="text-lg leading-relaxed tracking-tight text-muted-foreground max-w-xl text-center">
              Use the extension for free with a limited number of requests, or connect your own LLM API key (OpenAI, Anthropic, Gemini, and more) for unlimited access.
            </p>
          </div>
          <div className="grid pt-20 text-left grid-cols-1 lg:grid-cols-3 w-full gap-8">
            <Card className="w-full rounded-md">
              <CardHeader>
                <CardTitle>
                  <span className="flex flex-row gap-4 items-center font-normal">
                    Free Tier
                  </span>
                </CardTitle>
                <CardDescription>
                  Try all features with a limited number of free requests every month.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-8 justify-start">
                  <p className="flex flex-row  items-center gap-2 text-xl">
                    <span className="text-4xl">$0</span>
                    <span className="text-sm text-muted-foreground"> / month</span>
                  </p>
                  <div className="flex flex-col gap-4 justify-start">
                    <div className="flex flex-row gap-4">
                        <Check className="w-4 h-4 mt-2 text-primary" />
                      <div className="flex flex-col">
                        <p>All features included</p>
                        <p className="text-muted-foreground text-sm">
                          Analyze screenshots, generate replies, group conversations, and more.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                        <Check className="w-4 h-4 mt-2 text-primary" />
                      <div className="flex flex-col">
                        <p>Limited free requests</p>
                        <p className="text-muted-foreground text-sm">
                          Enjoy a set number of free uses every month.
                        </p>
                      </div>
                    </div>
                  </div>
                  {user ? (
                    <div className="mt-8 text-center">
                      <Button className="w-full" variant="outline" disabled>
                        Activated
                      </Button>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Next Payment: {subscription?.isActive && subscription.expiresAt ? formatExpiryDate(subscription.expiresAt) : 'N/A'}
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleFreeSignUp}
                      className="mt-8 w-full"
                      variant="outline"
                    >
                      Get Started Free
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="w-full shadow-2xl rounded-md">
              <CardHeader>
                <CardTitle>
                  <span className="flex flex-row gap-4 items-center font-normal">
                    Unlimited (BYO API Key)
                  </span>
                </CardTitle>
                <CardDescription>
                  Connect your own LLM API key (OpenAI, Anthropic, Gemini, etc.) for unlimited access to all features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-8 justify-start">
                  <p className="flex flex-row  items-center gap-2 text-xl">
                    <span className="text-4xl">$0</span>
                    <span className="text-sm text-muted-foreground"> (with your LLM API key)</span>
                  </p>
                  <div className="flex flex-col gap-4 justify-start">
                    <div className="flex flex-row gap-4">
                        <Check className="w-4 h-4 mt-2 text-primary" />
                      <div className="flex flex-col">
                        <p>No limits when you use your own LLM API key.</p>
                        <p className="text-muted-foreground text-sm">
                          Full access to screenshot analysis, writing, grouping, and more.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                        <Check className="w-4 h-4 mt-2 text-primary" />
                      <div className="flex flex-col">
                        <p>All features included</p>
                        <p className="text-muted-foreground text-sm">
                          Full access to screenshot analysis, writing, grouping, and more.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button className="gap-4">
                    Connect API Key <MoveRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="w-full rounded-md">
              <CardHeader>
                <CardTitle>
                  <span className="flex flex-row gap-4 items-center font-normal">
                    Enterprise
                  </span>
                </CardTitle>
                <CardDescription>
                  Need more? Contact us for custom solutions and support for your team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-8 justify-start">
                  <p className="flex flex-row  items-center gap-2 text-xl">
                    <span className="text-4xl">Contact Us</span>
                    <span className="text-sm text-muted-foreground">&nbsp;</span>
                  </p>
                  <div className="flex flex-col gap-4 justify-start">
                    <div className="flex flex-row gap-4">
                        <Check className="w-4 h-4 mt-2 text-primary" />
                      <div className="flex flex-col">
                        <p>Team management</p>
                        <p className="text-muted-foreground text-sm">
                          Manage users and permissions at scale.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                        <Check className="w-4 h-4 mt-2 text-primary" />
                      <div className="flex flex-col">
                        <p>Dedicated support</p>
                        <p className="text-muted-foreground text-sm">
                          Priority help and custom solutions.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                        <Check className="w-4 h-4 mt-2 text-primary" />
                      <div className="flex flex-col">
                        <p>Custom integrations</p>
                        <p className="text-muted-foreground text-sm">
                          Integrate with your internal tools and workflows.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="gap-4">
                    Contact Sales <PhoneCall className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 