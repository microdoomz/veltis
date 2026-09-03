import yahooFinance from 'yahoo-finance2';
import { money } from '../money';

export interface MarketPriceResult {
  priceMinor: bigint;
  currency: string;
}

export interface MarketDataProvider {
  getProviderName(): string;
  fetchPrice(symbol: string): Promise<MarketPriceResult | null>;
}

export class YahooFinanceProvider implements MarketDataProvider {
  getProviderName(): string {
    return 'yahoo-finance2';
  }

  async fetchPrice(symbol: string): Promise<MarketPriceResult | null> {
    try {
      // Suppress noisy yahoo-finance logging
      // @ts-expect-error yahoo finance library types are loose
      yahooFinance.suppressNotices(['yahooSurvey']);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote: any = await yahooFinance.quote(symbol);
      if (!quote || !quote.regularMarketPrice || !quote.currency) {
        return null;
      }
      
      // We assume standard 2 decimal precision for minor units, 
      // but ideally we should get the currency precision.
      // For V1, we fallback to 2 which is standard for most fiats.
      const priceMinor = money.fromMajor(quote.regularMarketPrice, 2);
      
      return {
        priceMinor,
        currency: quote.currency.toUpperCase(),
      };
    } catch (e) {
      console.error(`Failed to fetch market data for ${symbol} via Yahoo Finance:`, e);
      return null;
    }
  }
}

export function getMarketProvider(): MarketDataProvider {
  const providerType = process.env.MARKET_DATA_PROVIDER;
  
  if (!providerType) {
    throw new Error('MARKET_DATA_PROVIDER environment variable is missing. Must be set to a supported provider (e.g. "yahoo").');
  }

  if (providerType === 'yahoo') {
    return new YahooFinanceProvider();
  }

  throw new Error(`Unsupported MARKET_DATA_PROVIDER: ${providerType}`);
}

export const marketProvider: MarketDataProvider = getMarketProvider();
