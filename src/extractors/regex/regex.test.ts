import { describe, expect, it } from 'bun:test';
import type { ExtractRequest } from '~/types';
import RegexExtractorService from './services/regex-extractor';

const service = new RegexExtractorService();

describe('Regex Extractor Service', () => {
  describe('Coupon Detection', () => {
    it('should extract coupon from Nike example', () => {
      const input: ExtractRequest = {
        text: `CUPOM NIKE AINDA ATIVO

👟 Tênis Nike Air Max Nuaxis

🔥 DE 549 | POR 287
🎟 CUPOM: NIKE40
🔗 https://tidd.ly/47WTzXC`,
        chat: 'hardmob_promos',
        messageId: 12345,
        links: ['https://tidd.ly/47WTzXC'],
      };

      const result = service.extract(input);

      expect(result.text).toBeDefined();
      expect(result.text).not.toContain('OLHA O COMBOOO'); // Cleaned
      expect(result.product).toContain('Tênis');
      expect(result.coupons).toHaveLength(1);
      expect(result.coupons[0]?.code).toBe('NIKE40');
      expect(result.price).toBe(28700); // 287 em centavos
    });

    it('should extract multiple coupons', () => {
      const input: ExtractRequest = {
        text: `Ali Magalu - Galaxy S25 5G 256GB

R$ 3.447,76 - 12x sem juros

cupom: HARDMOB8 / PROMOBR08
https://s.click.aliexpress.com/e/_c3y5otih`,
        chat: 'hardmob_promos',
        messageId: 12347,
        links: ['https://s.click.aliexpress.com/e/_c3y5otih'],
      };

      const result = service.extract(input);

      expect(result.coupons).toHaveLength(2);
      expect(result.coupons[0]?.code).toBe('HARDMOB8');
      expect(result.coupons[1]?.code).toBe('PROMOBR08');
      expect(result.price).toBe(344776); // 3447.76 em centavos
    });

    it('should handle Mercado Livre coupon', () => {
      const input: ExtractRequest = {
        text: `Mercado Livre
15% OFF
* Em todos os produtos
* Limite de R$60

cupom: CUPOMNOMELI
https://mercadolivre.com/sec/1caqtpF`,
        chat: 'hardmob_promos',
        messageId: 12348,
        links: ['https://mercadolivre.com/sec/1caqtpF'],
      };

      const result = service.extract(input);

      expect(result.coupons).toHaveLength(1);
      expect(result.coupons[0]?.code).toBe('CUPOMNOMELI');
      expect(result.coupons[0]?.discount).toBe('15% OFF');
    });

    it('should NOT detect NIKE as coupon, only NIKE40', () => {
      const input: ExtractRequest = {
        text: `CUPOM NIKE AINDA ATIVO

👟 Tênis Nike Air Max Nuaxis

🔥 DE 549 | POR 287
🎟 CUPOM: NIKE40`,
        chat: 'hardmob_promos',
        messageId: 12345,
        links: [],
      };

      const result = service.extract(input);

      expect(result.coupons).toHaveLength(1);
      expect(result.coupons[0]?.code).toBe('NIKE40');
    });
  });

  describe('Price Extraction', () => {
    it('should extract price from Amazon example', () => {
      const input: ExtractRequest = {
        text: `Amazon - Só no app

30% off em Livros
* 03/11 ate 20/11

https://www.hardmob.com.br/threads/833119`,
        chat: 'hardmob_promos',
        messageId: 12346,
        links: ['https://www.hardmob.com.br/threads/833119'],
      };

      const result = service.extract(input);

      expect(result.coupons).toHaveLength(0);
    });

    it('should extract price in cents', () => {
      const input: ExtractRequest = {
        text: `Produto teste

POR R$ 99,90

https://example.com`,
        chat: 'test',
        messageId: 1,
        links: ['https://example.com'],
      };

      const result = service.extract(input);

      expect(result.price).toBe(9990); // 99.90 em centavos
    });
  });

  describe('Edge Cases', () => {
    it('should not detect coupon when only mentioned in text', () => {
      const input: ExtractRequest = {
        text: `🔥 332° - Cupom Mercado Livre 15% limitado em R$60
🎫 Cupom
🏪 Mercado Livre
💬 11 Comentários

➡️ https://promo.ninja/dRzRe

⚠️ Essa promo pode acabar a qualquer momento`,
        chat: 'test_channel',
        messageId: 127,
        links: ['https://promo.ninja/dRzRe'],
      };

      const result = service.extract(input);

      // Should not detect coupon because no actual coupon code is present
      expect(result.coupons).toHaveLength(0);
    });

    it('should return empty when no price or coupon', () => {
      const input: ExtractRequest = {
        text: `Nova promoção chegando em breve!
Fique ligado no canal.`,
        chat: 'test',
        messageId: 1,
        links: [],
      };

      const result = service.extract(input);

      expect(result.price).toBeNull();
      expect(result.coupons).toHaveLength(0);
    });
  });
});
