import type { ExtractRequest, ExtractResponse } from '~/types';
import { cleanPromoText } from '../cleaners/text-cleaner';
import { detectCoupons } from '../detectors/coupon-detector';
import { extractDescription } from '../extractors/description-extractor';
import { extractPrice } from '../extractors/price-extractor';
import { extractProductName } from '../extractors/product-extractor';
import { extractStore } from '../extractors/store-extractor';

export default class RegexExtractorService {
  extract(input: ExtractRequest): ExtractResponse {
    const { text } = input;

    // Extract description from ORIGINAL text (before cleaning)
    const description = extractDescription(text);

    // Clean promotional footers
    const cleanedText = cleanPromoText(text);

    // Extract components from cleaned text
    const { coupons } = detectCoupons(cleanedText);
    const priceCents = extractPrice(cleanedText);
    const product = extractProductName(cleanedText);
    const store = extractStore(cleanedText);

    // Build response
    const response: ExtractResponse = {
      text: cleanedText,
      description,
      product,
      store,
      price: priceCents,
      coupons,
    };

    return response;
  }
}
