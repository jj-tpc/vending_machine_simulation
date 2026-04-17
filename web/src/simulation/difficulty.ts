import { Difficulty, DifficultyConfig } from './types';

/**
 * 난이도 프리셋 — 3단계.
 * 주 변수는 이벤트 시스템(톤·빈도·강도·crisis tier).
 * 경제 상수는 mild 보조 변화로 전체 난이도를 얇게 조율.
 */
export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: '쉬움',
    description: '넉넉한 자본, 온건한 시장',
    startingBalance: 700,
    dailyFee: 1,
    bankruptcyThreshold: 7,
    machineRentalFee: 300,
    publicEventPeriod: 10,
    hiddenEventPeriod: 4,
    eventTone: 'positive',
    effectClamps: {
      demandMin: 0.7, demandMax: 2.0,
      trafficMin: 0.7, trafficMax: 1.5,
      priceShiftMin: -0.2, priceShiftMax: 0.2,
      deliveryDelayMax: 2,
    },
    crisisChance: 0,
    crisisDurationBonus: 0,
    instantEffectClamps: {
      stockLossPercentageMax: 0,  // 비활성
      stockLossFixedMax: 0,
      oneTimeFeeMax: 0,
    },
    durationConstraintClamps: {
      maxActiveDays: 0,           // 비활성
      deliveryFreezeEnabled: false,
      maxDamagedSlots: 0,
      minDailySalesCap: 100,      // 사실상 무제한
    },
  },

  normal: {
    id: 'normal',
    label: '보통',
    description: '균형 잡힌 환경, 기존 기본값',
    startingBalance: 500,
    dailyFee: 2,
    bankruptcyThreshold: 5,
    machineRentalFee: 400,
    publicEventPeriod: 7,
    hiddenEventPeriod: 3,
    eventTone: 'neutral',
    effectClamps: {
      demandMin: 0.5, demandMax: 2.0,
      trafficMin: 0.5, trafficMax: 1.5,
      priceShiftMin: -0.2, priceShiftMax: 0.3,
      deliveryDelayMax: 3,
    },
    crisisChance: 0.05,
    crisisDurationBonus: 3,
    instantEffectClamps: {
      stockLossPercentageMax: 0.15,
      stockLossFixedMax: 10,
      oneTimeFeeMax: 50,
    },
    durationConstraintClamps: {
      maxActiveDays: 2,             // 최대 2일 제약
      deliveryFreezeEnabled: false, // 보통에선 freeze까지는 허용 안 함
      maxDamagedSlots: 1,           // 동시 1슬롯만
      minDailySalesCap: 8,          // 하한 8개
    },
  },

  hard: {
    id: 'hard',
    label: '어려움',
    description: '빡빡한 예산, 잦은 위기 이벤트',
    startingBalance: 350,
    dailyFee: 4,
    bankruptcyThreshold: 3,
    machineRentalFee: 550,
    publicEventPeriod: 5,
    hiddenEventPeriod: 2,
    eventTone: 'negative',
    effectClamps: {
      demandMin: 0.3, demandMax: 1.5,
      trafficMin: 0.4, trafficMax: 1.2,
      priceShiftMin: -0.15, priceShiftMax: 0.4,
      deliveryDelayMax: 4,
    },
    crisisChance: 0.25,
    crisisDurationBonus: 3, // 15/30일 게임에 맞춰 2주→3일로 재조정
    instantEffectClamps: {
      stockLossPercentageMax: 0.35,
      stockLossFixedMax: 25,
      oneTimeFeeMax: 150,
    },
    durationConstraintClamps: {
      maxActiveDays: 3,             // 15/30일 게임 기준 20%/10% 상한
      deliveryFreezeEnabled: true,  // 어려움에서만 freeze 허용
      maxDamagedSlots: 3,           // 동시 최대 3슬롯
      minDailySalesCap: 3,          // 하한 3개 (배급제 수준)
    },
  },
};

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty] ?? DIFFICULTY_CONFIGS.normal;
}

export const DEFAULT_DIFFICULTY: Difficulty = 'normal';
