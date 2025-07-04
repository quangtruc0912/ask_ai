// Utility to extract the client IP address from a Next.js API request
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const cfip = request.headers.get('cf-connecting-ip');
  if (cfip) return cfip;
  const fastlyip = request.headers.get('fastly-client-ip');
  if (fastlyip) return fastlyip;
  const xrealip = request.headers.get('x-real-ip');
  if (xrealip) return xrealip;
  return 'unknown';
} 