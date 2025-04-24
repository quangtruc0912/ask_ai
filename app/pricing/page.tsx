'use client';

import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';


// Test card data
const TEST_CARDS = {
  success: '4242 4242 4242 4242',
  decline: '4000 0000 0000 0002',
  expiry: 'Any future date',
  cvc: 'Any 3 digits'
};

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showTestInfo, setShowTestInfo] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [copiedText, setCopiedText] = useState('');
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

  const handleProSubscription = async () => {
    try {
      setIsLoading(true);
      const idToken = await user?.getIdToken();
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`, // Add the Firebase ID token
        },
        body: JSON.stringify({
          email: user?.email,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Store test data and show test info modal
      if (data.testData) {
        setTestData(data.testData);
        setShowTestInfo(true);
        return;
      }

      // Redirect to Stripe Checkout if no test data
      window.location.href = data.sessionUrl;
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const proceedToPayment = () => {
    setShowTestInfo(false);
    if (testData) {
      window.location.href = testData.sessionUrl;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20">
      {/* Test Payment Info Modal */}
      {showTestInfo && testData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Test Payment Information
              </h3>
              <button
                onClick={() => setShowTestInfo(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  This is a test mode. No real charges will be made.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Test Card Numbers</h4>

                {/* Success Card */}
                <div className="relative group">
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        Successful Payment
                      </span>
                      <button
                        onClick={() => copyToClipboard(testData.cardNumbers.success, 'success')}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                      >
                        {copiedText === 'success' ? (
                          <span className="text-sm">Copied!</span>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-lg text-green-800 dark:text-green-200">
                      {testData.cardNumbers.success}
                    </p>
                  </div>
                </div>

                {/* Decline Card */}
                <div className="relative group">
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-red-800 dark:text-red-200">
                        Declined Payment
                      </span>
                      <button
                        onClick={() => copyToClipboard(testData.cardNumbers.decline, 'decline')}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                      >
                        {copiedText === 'decline' ? (
                          <span className="text-sm">Copied!</span>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-lg text-red-800 dark:text-red-200">
                      {testData.cardNumbers.decline}
                    </p>
                  </div>
                </div>

                {/* Other Test Data */}
                <div className="mt-6 space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Other Test Data</h5>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <p>
                        <span className="font-medium">Expiry Date:</span>{' '}
                        <span className="font-mono">{testData.expiryDate}</span>
                      </p>
                      <p>
                        <span className="font-medium">CVC:</span>{' '}
                        <span className="font-mono">{testData.cvc}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={proceedToPayment}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Upgrade to Ask AI Pro
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            The Smartest Way to Search, Learn, Create, & Succeed
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="flex flex-col h-full">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Free
              </h2>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
                <span className="text-gray-600 dark:text-gray-300 ml-2">per month</span>
              </div>
              <div className="space-y-4 flex-grow">
                <div className="flex items-center space-x-3">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Enhance your browsing experience</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Summary your screenshot any website</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Track & revisit your searches anytime</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">5 Pro Analysis</span>
                </div>
              </div>
              {user ? (
                <div className="mt-8 text-center">
                  <button
                    className="w-full bg-green-500 text-white font-semibold py-3 px-8 rounded-full transition duration-300 cursor-default"
                  >
                    Activated
                  </button>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Next Payment: {subscription?.isActive && subscription.expiresAt ? formatExpiryDate(subscription.expiresAt) : 'N/A'}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleFreeSignUp}
                  className="mt-8 w-full bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 font-semibold py-3 px-8 rounded-full transition duration-300"
                >
                  Sign up
                </button>
              )}
            </div>
          </div>

          {/* Pro Tier */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-2 border-purple-500">
            <div className="flex flex-col h-full">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <span className="text-gray-900 dark:text-white">Ask AI</span>
                <span className="text-purple-500 ml-2">Pro</span>
              </h2>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$5</span>
                <span className="text-gray-600 dark:text-gray-300 ml-2">per month</span>
              </div>
              <div className="space-y-4 flex-grow">
                <div className="flex items-center space-x-3">
                  <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Everything in Free</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Access the most advanced AI reasoning</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">300 Pro Analysis</span>
                </div>
              </div>
              {user ? (
                subscription?.isActive ? (
                  <div className="mt-8 text-center">
                    <button
                      className="w-full bg-green-500 text-white font-semibold py-3 px-8 rounded-full transition duration-300 cursor-default"
                    >
                      Activated
                    </button>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Expires: {subscription.expiresAt ? formatExpiryDate(subscription.expiresAt) : 'N/A'}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleProSubscription}
                    disabled={isLoading}
                    className="mt-8 w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-8 rounded-full transition duration-300 disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Subscribe Now'}
                  </button>
                )
              ) : (
                <Link
                  href="/signup"
                  className="mt-8 w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-8 rounded-full transition duration-300 text-center"
                >
                  Sign up
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Test Card Information */}
        <div className="mt-8 max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800">
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
              Test Mode
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Success Card:</p>
              <p className="font-mono text-green-600 dark:text-green-400">{TEST_CARDS.success}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Decline Card:</p>
              <p className="font-mono text-red-600 dark:text-red-400">{TEST_CARDS.decline}</p>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use <span className="font-mono">{TEST_CARDS.expiry}</span> for expiry and <span className="font-mono">{TEST_CARDS.cvc}</span> for CVC
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 