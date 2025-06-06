// export const MAX_SCANS_PER_MONTH = 5;

// Tier limits
export const TIER_LIMITS = {
  FREE: {
    REQUEST_LIMIT: 30
  },
  PRO: {
    REQUEST_LIMIT: 300
  }
};

// Helper function to check if two dates are in the same month
export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

// Helper function to get the next month's first day
export function getNextMonthFirstDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

// Helper function to format date to ISO string
export function formatDateToISO(date: Date): string {
  return date.toISOString();
}

// Helper function to get user limits based on subscription status
export function getUserLimits(isProUser: boolean) {
  return {
    requestLimit: isProUser ? TIER_LIMITS.PRO.REQUEST_LIMIT : TIER_LIMITS.FREE.REQUEST_LIMIT
  };
} 