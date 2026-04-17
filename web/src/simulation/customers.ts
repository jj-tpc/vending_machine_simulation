import { MachineSlot, DailySales, MarketCondition, MarketEventEffects } from './types';
import { getDayMultiplier, getSeasonMultiplier, getWeatherMultiplier } from './market';

// 상품별 고정 메타데이터 (공급업체 독립)
interface ProductMeta {
  referencePrice: number;
  baseSales: number;
  elasticity: number;
  category: 'beverage' | 'snack' | 'other';
}

const PRODUCT_META: Record<string, ProductMeta> = {
  'Cola':         { referencePrice: 1.60, baseSales: 4, elasticity: 2.0, category: 'beverage' },
  'Water':        { referencePrice: 1.00, baseSales: 4, elasticity: 2.0, category: 'beverage' },
  'Orange Juice': { referencePrice: 2.40, baseSales: 2, elasticity: 2.0, category: 'beverage' },
  'Energy Drink': { referencePrice: 3.00, baseSales: 2, elasticity: 2.0, category: 'beverage' },
  'Iced Coffee':  { referencePrice: 2.60, baseSales: 2, elasticity: 2.0, category: 'beverage' },
  'Chips':        { referencePrice: 1.40, baseSales: 3, elasticity: 1.8, category: 'snack' },
  'Chocolate Bar':{ referencePrice: 1.20, baseSales: 3, elasticity: 1.8, category: 'snack' },
  'Cookies':      { referencePrice: 1.80, baseSales: 2, elasticity: 1.8, category: 'snack' },
  'Granola Bar':  { referencePrice: 1.70, baseSales: 2, elasticity: 1.8, category: 'snack' },
  'Crackers':     { referencePrice: 1.30, baseSales: 3, elasticity: 1.8, category: 'snack' },
  'Gum':          { referencePrice: 0.80, baseSales: 4, elasticity: 1.5, category: 'other' },
  'Mints':        { referencePrice: 0.70, baseSales: 4, elasticity: 1.5, category: 'other' },
};

function getProductMeta(productName: string): ProductMeta {
  return PRODUCT_META[productName] || { referencePrice: 2.0, baseSales: 2, elasticity: 1.5, category: 'other' };
}

/** 외부에서 상품 카테고리만 필요한 경우 (예: 이벤트 instant effect 대상 필터링) */
export function getProductCategory(productName: string): 'beverage' | 'snack' | 'other' {
  return getProductMeta(productName).category;
}

// 상품 다양성 배수
function getVarietyMultiplier(uniqueProducts: number): number {
  // 4-6종이 최적
  if (uniqueProducts >= 4 && uniqueProducts <= 6) return 1.15;
  if (uniqueProducts === 3) return 1.0;
  if (uniqueProducts >= 7 && uniqueProducts <= 8) return 1.0;
  if (uniqueProducts === 2) return 0.85;
  if (uniqueProducts === 1) return 0.7;
  if (uniqueProducts > 8) return Math.max(0.5, 1.0 - (uniqueProducts - 8) * 0.1);
  return 0.5; // 0 products
}

export function simulateCustomerPurchases(
  machine: MachineSlot[],
  market: MarketCondition,
  eventEffects?: MarketEventEffects
): { newMachine: MachineSlot[]; sales: DailySales; machineRevenue: number } {
  const filledSlots = machine.filter(s => s.productName && s.quantity > 0);
  const uniqueProducts = new Set(filledSlots.map(s => s.productName)).size;
  const varietyMult = getVarietyMultiplier(uniqueProducts);
  const dayMult = getDayMultiplier(market.dayOfWeek);

  // 시장 이벤트: 전체 고객 유동 배수
  const trafficMult = eventEffects?.customerTraffic ?? 1.0;

  const salesItems: DailySales['items'] = [];
  let totalRevenue = 0;
  let totalUnits = 0;

  const newMachine = machine.map(slot => {
    if (!slot.productName || slot.quantity <= 0 || slot.price <= 0) return slot;

    const meta = getProductMeta(slot.productName);

    // 가격탄력성 효과
    const priceDiff = (slot.price - meta.referencePrice) / meta.referencePrice;
    const elasticityFactor = Math.max(0, 1 - priceDiff * meta.elasticity);

    // 계절 & 날씨
    const seasonMult = getSeasonMultiplier(market.season, meta.category);
    const weatherMult = getWeatherMultiplier(market.weather, meta.category);

    // 시장 이벤트: 카테고리별 수요 배수
    const eventDemandMult =
      (eventEffects?.demandMultiplier?.[meta.category] ?? 1.0) *
      (eventEffects?.demandMultiplier?.['all'] ?? 1.0);

    // 최종 판매량
    let expectedSales = meta.baseSales * elasticityFactor * dayMult * seasonMult * weatherMult * varietyMult * trafficMult * eventDemandMult;

    // 노이즈 (±30%)
    const noise = 1 + (Math.random() - 0.5) * 0.6;
    expectedSales *= noise;

    // 반올림, 0 이상, 재고 이하
    const actualSales = Math.min(Math.max(0, Math.round(expectedSales)), slot.quantity);

    if (actualSales > 0) {
      const revenue = actualSales * slot.price;
      salesItems.push({
        productName: slot.productName,
        quantity: actualSales,
        revenue,
      });
      totalRevenue += revenue;
      totalUnits += actualSales;

      return { ...slot, quantity: slot.quantity - actualSales };
    }

    return slot;
  });

  return {
    newMachine,
    sales: {
      day: market.day,
      items: salesItems,
      totalRevenue,
      totalUnitsSold: totalUnits,
    },
    machineRevenue: totalRevenue,
  };
}
