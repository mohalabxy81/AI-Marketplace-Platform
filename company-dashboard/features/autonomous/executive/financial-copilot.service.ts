/**
 * AU.1 — Financial Copilot Service
 * Revenue waterfall, MRR/ARR bridging, cash flow projections
 */

export interface FinancialSnapshot {
  arr_usd: number;
  mrr_usd: number;
  arr_growth_mom: number;
  mrr_growth_mom: number;
  gross_margin: number;
  burn_rate_usd: number;
  runway_months: number;
  ltv_usd: number;
  cac_usd: number;
  ltv_cac_ratio: number;
  nrr: number;  // Net Revenue Retention
  grr: number;  // Gross Revenue Retention
}

export interface RevenueBridge {
  starting_mrr: number;
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churned_mrr: number;
  ending_mrr: number;
  net_new_mrr: number;
}

export interface CashFlowProjection {
  month: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  opex: number;
  ebitda: number;
  cash_balance: number;
}

export const FinancialCopilotService = {
  async getFinancialSnapshot(): Promise<FinancialSnapshot> {
    return {
      arr_usd: 2_640_000,
      mrr_usd: 220_000,
      arr_growth_mom: 0.087,
      mrr_growth_mom: 0.087,
      gross_margin: 0.74,
      burn_rate_usd: 84_000,
      runway_months: 28,
      ltv_usd: 48_000,
      cac_usd: 820,
      ltv_cac_ratio: 58.5,
      nrr: 1.14,
      grr: 0.92,
    };
  },

  async getRevenueBridge(month: string): Promise<RevenueBridge> {
    return {
      starting_mrr: 202_400,
      new_mrr: 31_200,
      expansion_mrr: 14_800,
      contraction_mrr: -8_200,
      churned_mrr: -19_900,
      ending_mrr: 220_300,
      net_new_mrr: 17_900,
    };
  },

  async getCashFlowProjection(months: number = 12): Promise<CashFlowProjection[]> {
    const baseRevenue = 220_000;
    const growthRate = 0.087;
    return Array.from({ length: months }, (_, i) => {
      const revenue = baseRevenue * Math.pow(1 + growthRate, i);
      const cogs = revenue * 0.26;
      const grossProfit = revenue - cogs;
      const opex = 84_000 + (i * 2_000);
      const ebitda = grossProfit - opex;
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      return {
        month: date.toISOString().slice(0, 7),
        revenue: Math.round(revenue),
        cogs: Math.round(cogs),
        gross_profit: Math.round(grossProfit),
        opex: Math.round(opex),
        ebitda: Math.round(ebitda),
        cash_balance: Math.round(2_340_000 + (ebitda * (i + 1))),
      };
    });
  },

  async getAIRecommendation(): Promise<string> {
    return 'NRR at 114% exceeds benchmark. Accelerate expansion motion — Expansion Agent has 23 qualified upgrade candidates. Target: +$28K MRR in Q3.';
  },

  async exportBoardPack(): Promise<{ url: string; generated_at: string }> {
    return {
      url: `/api/autonomous/financial/board-pack/${new Date().toISOString().slice(0, 10)}`,
      generated_at: new Date().toISOString(),
    };
  },
};
