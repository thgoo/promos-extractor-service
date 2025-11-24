/**
 * Product Extractor
 * Extracts product name and brand from text
 */

/**
 * Extract product name from text
 *
 * Tries to find the product name from the first meaningful line
 * Skips lines that are clearly not product names (coupons, prices, links, etc)
 *
 * @param text - Message text to extract product name from
 * @returns Product name or null
 *
 * @example
 * extractProductName("Tênis Nike Air Max\nR$ 287") // => "Tênis Nike Air Max"
 */
export function extractProductName(text: string): string | null {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip lines that are clearly not product names
    if (
      /^(cupom|código|desconto|promoção|oferta)/i.test(trimmed) ||
      /^(R\$|por\s+R\$)/i.test(trimmed) ||
      /^(https?:\/\/)/i.test(trimmed) ||
      /^[🎫🎟💳🔥⚡️✨🎁🛒📢]/u.test(trimmed)
    ) {
      continue;
    }

    // Remove emojis and clean up
    const cleaned = trimmed
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
      .replace(/^\s*[-•*]\s*/, '') // Remove list markers
      .trim();

    if (cleaned.length > 5 && cleaned.length < 200) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Extract brand from text or product name
 *
 * Matches against a list of common brands
 *
 * @param text - Message text
 * @param productName - Product name (optional)
 * @returns Brand name or null
 *
 * @example
 * extractBrand("Tênis Nike Air Max", null) // => "Nike"
 */
export function extractBrand(text: string, productName: string | null): string | null {
  // Common brands
  const brands = [
    'Nike', 'Adidas', 'Puma', 'Samsung', 'Apple', 'Xiaomi', 'Motorola',
    'LG', 'Sony', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Microsoft',
    'Logitech', 'Razer', 'HyperX', 'Corsair', 'Kingston', 'SanDisk',
  ];

  const textLower = text.toLowerCase();
  const productLower = productName?.toLowerCase() || '';

  for (const brand of brands) {
    if (textLower.includes(brand.toLowerCase()) || productLower.includes(brand.toLowerCase())) {
      return brand;
    }
  }

  return null;
}
