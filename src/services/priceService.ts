import axios from "axios";

interface JupiterResponse {
  data?: Record<
    string,
    {
      id: string;
      price: number;
    }
  >;
}

export class PriceService {
  async getPriceUsd(mint: string): Promise<number | null> {
    try {
      const url = `https://lite-api.jup.ag/price/v2?ids=${encodeURIComponent(mint)}`;
      const response = await axios.get<JupiterResponse>(url, { timeout: 8_000 });
      const value = response.data?.data?.[mint]?.price;
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      return null;
    } catch {
      return null;
    }
  }
}
