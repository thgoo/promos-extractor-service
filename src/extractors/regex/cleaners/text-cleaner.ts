/**
 * Text Cleaner
 * Removes promotional footers and call-to-action text from messages
 */

/**
 * Removes call-to-action footers from promo messages.
 * Common patterns:
 * - "💰Entre no nosso grupo de ofertas:"
 * - "📱 GARIMPOS DO DE PINHO 📱"
 * - Links to Telegram/Whatsapp groups
 * - "OLHA O COMBOOO!" type comments
 *
 * @param text - Message text to clean
 * @returns Cleaned text without promotional footers
 *
 * @example
 * cleanPromoText("Produto\n\n💰Entre no nosso grupo") // => "Produto"
 * cleanPromoText("OLHA O COMBOOO!\n\nProduto") // => "Produto"
 */
export function cleanPromoText(text: string): string {
  const lines = text.split('\n');
  const cleanedLines: string[] = [];
  let foundFooter = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect footer patterns
    const isFooterLine =
      // "💰Entre no nosso grupo" pattern
      /💰\s*entre\s+no\s+nosso\s+grupo/iu.test(trimmed) ||
      // "Telegram:" or "Whatsapp:" labels
      /^(telegram|whatsapp):\s*$/i.test(trimmed) ||
      // Channel promotion with emojis
      /^(?:📱|🎯|💰|🔥|✨)+\s*[A-Z\s]+(?:📱|🎯|💰|🔥|✨)+\s*$/iu.test(trimmed) ||
      // t.me or bit.ly links after footer started
      (foundFooter && /https?:\/\/(t\.me|bit\.ly|chat\.whatsapp\.com)/i.test(trimmed)) ||
      // "Compre aqui:" pattern
      /^compre\s+aqui:\s*$/i.test(trimmed) ||
      // All caps exclamation comments (e.g., "OLHA O COMBOOO!")
      /^[A-Z\s!]+!+\s*$/u.test(trimmed);

    if (isFooterLine) {
      foundFooter = true;
      continue;
    }

    if (foundFooter && trimmed === '') {
      continue;
    }

    if (!foundFooter) {
      cleanedLines.push(line);
    }
  }

  return cleanedLines.join('\n').trimEnd();
}
