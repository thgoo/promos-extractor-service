/**
 * Comment Extractor
 * Extracts channel owner's comments/descriptions from promotional posts
 */

/**
 * Extract channel owner's comment from text
 *
 * Detects patterns like:
 * - "OLHA O COMBOOO!"
 * - "IMPERDÍVEL!"
 * - "CORRE QUE ACABA!"
 *
 * Usually appears at the beginning before the product description
 *
 * @param text - Message text to extract comment from
 * @returns Owner's comment or null
 *
 * @example
 * extractDescription("OLHA O COMBOOO!\n\nSmart TV...") // => "OLHA O COMBOOO!"
 * extractDescription("IMPERDÍVEL!\n\nProduto...") // => "IMPERDÍVEL!"
 */
export function extractDescription(text: string): string | null {
  const lines = text.split('\n');

  // Check first few lines for comment patterns
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // Pattern: All caps with exclamation marks
    // Examples: "OLHA O COMBOOO!", "IMPERDÍVEL!", "CORRE!"
    if (/^[A-Z\s!]+!+\s*$/u.test(line)) {
      return line;
    }

    // Pattern: Emoji + short excited text
    // Examples: "🔥 OFERTA RELÂMPAGO!", "😱 QUE PREÇO!"
    if (/^(?:🔥|😱|🤯|✨|👀|💥)+\s*[A-Z\s!]+!+\s*$/u.test(line)) {
      return line;
    }

    // If we hit product description or price, stop looking
    if (
      /^(?:📺|👟|🎮|📱|⌨️)/u.test(line) || // Product emojis
      /R\$\s*\d+/i.test(line) || // Price
      /cupom:/i.test(line) // Coupon
    ) {
      break;
    }
  }

  return null;
}
