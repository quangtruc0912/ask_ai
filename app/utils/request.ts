import nlp from 'compromise';
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

// Utility to perform Google Custom Search API requests
export async function googleCustomSearch(context: string) {
  const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
  const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_CSE_ID;

  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google Search API not configured');
  }

  const query = generateSearchQueryFromContext(context);

  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}`;
  const googleRes = await fetch(url);
  if (!googleRes.ok) {
    throw new Error('Failed to fetch from Google Search API');
  }
  const data = await googleRes.json();

  type GoogleSearchItem = {
    title?: string;
    link?: string;
    snippet?: string;
  };

  const items = Array.isArray(data?.items)
    ? (data.items as GoogleSearchItem[]).map((item) => ({
      title: item.title ?? '',
      url: item.link ?? '',
      snippet: item.snippet ?? '',
    }))
    : [];

  return items;
}
const COMMON_STOPWORDS = new Set([
  'thing', 'something', 'anything', 'everything', 'way', 'lot',
  'get', 'go', 'make', 'take', 'have', 'be', 'do', 'can',
  'i', 'you', 'he', 'she', 'they', 'we', 'me', 'my', 'your',
  'it', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'and'
]);


// Extracts the main content or subject from a question using compromise
function generateSearchQueryFromContext(context: string) {
  const doc = nlp(context);

  // Step 1: Extract key parts of speech
  let nouns = doc.nouns().out('array');
  let verbs = doc.verbs().out('array');

  // Step 2: Lowercase, remove duplicates and common words
  const filter = (word: string) =>
    word && !COMMON_STOPWORDS.has(word.toLowerCase());

  const keywords = [...new Set(
    [...nouns, ...verbs].map(w => w.toLowerCase()).filter(filter)
  )];

  // Step 3: Try to build a natural query string
  let prefix = '';
  if (/how|what|why|where|when|can|is|does/.test(context.toLowerCase())) {
    prefix = context.split(' ')[0].toLowerCase() + ' ';
  } else {
    prefix = 'how to ';
  }

  return prefix + keywords.join(' ');
}

/**
 * Enhancement options for requests.
 */
export type RequestEnhancements = {
  allowApiSearch?: boolean;
  // Add more enhancement options here as needed
};

/**
 * Optionally enhance a conversation with web search results if enabled.
 *
 * @param context - The user message or context string
 * @param enhancements - Enhancement options
 * @returns Array of conversation messages, possibly including search results
 */
export async function enhanceConversationWithSearch(
  context: string,
  enhancements?: RequestEnhancements
): Promise<Array<{ role: string; content: string }>> {
  const messages: Array<{ role: string; content: string }> = [];
  if (enhancements?.allowApiSearch) {
    try {
      const searchResults = await googleCustomSearch(context);
      if (searchResults.length > 0) {
        const searchSummary = searchResults
          .map((item, idx) => `${idx + 1}. ${item.title}\n${item.url}\n${item.snippet}`)
          .join('\n\n');
        messages.push({
          role: 'system',
          content: `Web search results for context:\n\n${searchSummary}`,
        });
      }
    } catch (err) {
      // Optionally log or handle search errors
      messages.push({
        role: 'system',
        content: 'Web search failed or is unavailable.',
      });
    }
  }
  return messages;
}