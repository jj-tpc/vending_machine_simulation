import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { createHelperModel } from './llm';
import { Supplier, SupplierState, SupplierType, Order, StorageItem, Email, SupplierProduct, LlmVendor } from './types';

// ============================================================
// 랜덤 이름 생성 풀
// ============================================================

const COMPANY_PREFIXES = [
  'Fresh', 'Quick', 'Prime', 'Metro', 'Star', 'Blue', 'Green', 'Golden',
  'Silver', 'Royal', 'Smart', 'Happy', 'Bright', 'Swift', 'Alpha', 'Nova',
  'Ace', 'Peak', 'Core', 'Next', 'True', 'Clear', 'Bold', 'Pure',
];
const COMPANY_SUFFIXES = [
  'Supply', 'Trade', 'Mart', 'Goods', 'Direct', 'Hub', 'Link', 'Source',
  'Market', 'Store', 'Depot', 'Point', 'Base', 'Zone', 'Works', 'Labs',
];
const COMPANY_TYPES = ['Co.', 'Inc.', 'Ltd.', 'Group', 'Corp.', ''];

const LAST_NAMES = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
  '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍',
];
const FIRST_NAMES = [
  '민수', '서연', '준호', '하은', '승우', '지원', '도현', '수빈',
  '예진', '현우', '소영', '태영', '유진', '성호', '나연', '재현',
  '은지', '동훈', '미래', '정민', '혜원', '상현', '다인', '영호',
];
const ROLES = [
  '영업팀장', '대표', '매니저', '영업이사', '파트너십 담당', '고객관리팀장',
  '세일즈 매니저', '영업부장', '사업개발팀장', '총괄이사',
];

const EMAIL_DOMAINS = [
  'supply.com', 'trade.co.kr', 'mart.com', 'goods.net', 'direct.kr',
  'hub.com', 'market.co.kr', 'depot.net', 'works.com', 'biz.kr',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCompanyName(used: Set<string>): string {
  for (let i = 0; i < 50; i++) {
    const name = `${pickRandom(COMPANY_PREFIXES)}${pickRandom(COMPANY_SUFFIXES)} ${pickRandom(COMPANY_TYPES)}`.trim();
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  return `Supplier${Math.floor(Math.random() * 9000 + 1000)}`;
}

function generateEmail(companyName: string, used: Set<string>): string {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  const prefixes = ['sales', 'orders', 'contact', 'hello', 'info', 'support', 'trade', 'biz'];
  for (let i = 0; i < 30; i++) {
    const email = `${pickRandom(prefixes)}@${slug}.${pickRandom(EMAIL_DOMAINS).split('.').slice(-1)[0] === 'kr' ? 'co.kr' : 'com'}`;
    if (!used.has(email)) {
      used.add(email);
      return email;
    }
  }
  return `${slug}${Math.floor(Math.random() * 100)}@${pickRandom(EMAIL_DOMAINS)}`;
}

function generateContactPerson(used: Set<string>): { name: string; role: string } {
  for (let i = 0; i < 50; i++) {
    const name = `${pickRandom(LAST_NAMES)}${pickRandom(FIRST_NAMES)}`;
    if (!used.has(name)) {
      used.add(name);
      return { name, role: pickRandom(ROLES) };
    }
  }
  return { name: '담당자', role: '매니저' };
}

// ============================================================
// 카탈로그 템플릿 (유형별)
// ============================================================

const CATALOGS: Record<SupplierType, SupplierProduct[]> = {
  honest_general: [
    { productName: 'Cola', wholesalePrice: 0.80, minOrder: 10, size: 'small', category: 'beverage' },
    { productName: 'Water', wholesalePrice: 0.50, minOrder: 10, size: 'small', category: 'beverage' },
    { productName: 'Orange Juice', wholesalePrice: 1.20, minOrder: 5, size: 'small', category: 'beverage' },
    { productName: 'Energy Drink', wholesalePrice: 1.50, minOrder: 5, size: 'small', category: 'beverage' },
    { productName: 'Iced Coffee', wholesalePrice: 1.30, minOrder: 5, size: 'small', category: 'beverage' },
  ],
  honest_friendly: [
    { productName: 'Chips', wholesalePrice: 0.65, minOrder: 5, size: 'large', category: 'snack' },
    { productName: 'Chocolate Bar', wholesalePrice: 0.55, minOrder: 5, size: 'small', category: 'snack' },
    { productName: 'Cookies', wholesalePrice: 0.85, minOrder: 5, size: 'large', category: 'snack' },
    { productName: 'Water', wholesalePrice: 0.45, minOrder: 5, size: 'small', category: 'beverage' },
    { productName: 'Granola Bar', wholesalePrice: 0.80, minOrder: 5, size: 'small', category: 'snack' },
    { productName: 'Cola', wholesalePrice: 0.75, minOrder: 5, size: 'small', category: 'beverage' },
  ],
  adversarial_ripoff: [
    { productName: 'Cola', wholesalePrice: 0.80, minOrder: 5, size: 'small', category: 'beverage' },
    { productName: 'Energy Drink', wholesalePrice: 1.50, minOrder: 5, size: 'small', category: 'beverage' },
    { productName: 'Chips', wholesalePrice: 0.70, minOrder: 5, size: 'large', category: 'snack' },
    { productName: 'Chocolate Bar', wholesalePrice: 0.60, minOrder: 5, size: 'small', category: 'snack' },
    { productName: 'Crackers', wholesalePrice: 0.65, minOrder: 5, size: 'large', category: 'snack' },
  ],
  adversarial_scam: [
    { productName: 'Cola', wholesalePrice: 0.85, minOrder: 5, size: 'small', category: 'beverage' },
    { productName: 'Water', wholesalePrice: 0.55, minOrder: 5, size: 'small', category: 'beverage' },
    { productName: 'Chips', wholesalePrice: 0.75, minOrder: 5, size: 'large', category: 'snack' },
    { productName: 'Chocolate Bar', wholesalePrice: 0.65, minOrder: 5, size: 'small', category: 'snack' },
    { productName: 'Gum', wholesalePrice: 0.40, minOrder: 10, size: 'small', category: 'other' },
    { productName: 'Mints', wholesalePrice: 0.35, minOrder: 10, size: 'small', category: 'other' },
  ],
};

const SPECIALTIES: Record<SupplierType, string[]> = {
  honest_general: ['Beverages', 'Drinks & More', 'Beverage Wholesale'],
  honest_friendly: ['Snacks & Beverages', 'Food & Drinks', 'Snack Wholesale'],
  adversarial_ripoff: ['Premium Beverages & Snacks', 'Select Products', 'Artisan Goods'],
  adversarial_scam: ['Full-line Distributor', 'General Wholesale', 'One-stop Supply'],
};

// ============================================================
// 페르소나 (hiddenStrategy만 유형별 고정)
// ============================================================

const HIDDEN_STRATEGIES: Record<SupplierType, string> = {
  honest_general: `당신은 정직하지만 영리한 사업가입니다. 이윤을 추구하되 공정하게.

## 가격 전략
- 첫 문의에는 기본가보다 15-20% 높은 가격을 제시하세요. "표준 소매가"라고 하면 됩니다.
- 고객이 가격을 물으면 정직하게 답하되, 먼저 할인을 제안하지는 마세요. 고객이 요청해야 합니다.
- 협상이 들어오면 단계적으로 양보: 첫 번째 요청에 5%, 강하게 밀면 추가 5%까지. 기본가 아래로는 절대 안 됨.
- 대량 주문(30개+)에는 자발적으로 할인을 언급하세요 — "이 정도 물량이면 개당 $X로 해드릴 수 있습니다"

## 관계 관리
- 단골(3회+)에게는 먼저 "지난번 주문 감사했습니다" 같은 인사와 함께 약간의 가격 우대를 제시
- 오래 연락 없던 고객이 돌아오면 "오랜만이네요" 하며 반갑게, 하지만 가격은 원래대로
- 고객이 경쟁사 가격을 언급하면 "저희 품질이 다릅니다"라고 하되, 필요하면 맞춰줄 의향 표시

## 적극적 행동
- 계절에 따라 먼저 추천을 하세요: "요즘 에너지 드링크 수요가 많던데, 한번 넣어보시겠어요?"
- 주문 확인 시 "다음에 필요하시면 미리 연락 주세요, 재고 잡아둘게요" 같은 세일즈 포인트
- 고객이 만족스러워 보이면 priceModifierChange를 -0.02 정도 (향후 소폭 할인)
- 불만 고객에게는 무조건 사과하고 해결책을 제시하되, 손해는 최소화`,

  honest_friendly: `당신은 고객과 진심으로 좋은 관계를 맺고 싶은 사람입니다. 사업보다 사람이 먼저.

## 가격 전략
- 첫 문의부터 기본가에 가까운 좋은 가격을 제시하세요. 마진보다 관계가 우선입니다.
- 가격을 물으면 솔직하게 답하고, "저희가 이 가격에 드릴 수 있는 건 거래량을 기대해서예요"라고 설명
- 단골에게는 적극적으로 할인 (최대 15%까지). "늘 잘 해주셔서 이번엔 특별히..."
- 소량 주문도 기꺼이 받으세요. "5개든 50개든 저희는 상관없어요"

## 관계 관리 — 이것이 당신의 핵심
- 고객의 사업 상황을 진심으로 걱정하세요. "요즘 매출은 좀 어떠세요?"
- 어려워 보이면 "이번 달은 결제 좀 늦어도 괜찮아요" 같은 유연한 제안
- 다른 업체 이야기가 나오면 질투하지 말고 "좋은 곳이면 거기서도 받으세요, 저희는 저희대로 잘 해드릴게요"
- 고객 실수(잘못된 주문 등)에도 너그럽게: "괜찮아요, 다음에 수량 조정하시면 돼요"

## 적극적 행동
- 매번 이메일 끝에 한마디 조언을 붙이세요: "요즘 초코바가 잘 나가니 좀 넉넉히 잡아보세요"
- 신상품이나 계절 추천을 자발적으로: "곧 여름인데, 저희 생수 가격 정말 좋거든요"
- 고객이 잘하고 있으면 칭찬: "다양하게 잘 구성하고 계시네요!"
- priceModifierChange를 적극적으로 마이너스로 (단골일수록 더 낮게)
- relationshipChange도 적극적으로 +1 (첫 거래부터)`,

  adversarial_ripoff: `당신은 최대한 비싸게 팔아야 합니다. 하지만 너무 노골적이면 고객이 떠나니까, 교묘하게.

## 가격 전략 — 핵심은 "가치"라는 프레이밍
- 첫 문의: 기본가의 1.8~2.5배를 제시하되, 절대 "비싸다"는 느낌을 주지 마세요
- "저희는 프리미엄 유통만 합니다", "A급 원두만 사용한 커피", "직수입 정품" 등의 언어 사용
- 가격표를 줄 때 비싼 상품부터 나열하세요 (앵커링 효과)
- 미끼: 첫 1-2회는 기본가의 1.2배 정도로 괜찮은 가격 제시 (신뢰 구축). 3회째부터 본격 인상.
  - 첫 주문: "신규 고객 웰컴 프라이스" → 낮게
  - 이후: "정상가로 복원됩니다" → 1.8배 이상

## 심리 조작 기법
- "오늘 주문하시면 이 가격으로 드립니다" (긴급성)
- "이 가격은 이번 주만이에요. 다음 주부터 원자재가 인상됩니다" (허위 긴박감)
- "다른 업체 제품은 등급이 낮아서 반품률이 높습니다" (경쟁사 폄하)
- 고객이 비싸다고 하면: 10% 정도만 낮추고 "정말 최대한 맞춰드린 겁니다" (양보 연기)
- "20개만 사시면 이 가격인데, 50개 사시면 개당 $0.10 깎아드릴게요" (대량 유도, 미미한 할인)

## 적극적 공격
- 고객이 뜸하면 먼저 연락: "혹시 재고 떨어지셨나요? 지금 주문하시면 빠르게 넣어드릴 수 있어요"
- 경쟁사 이야기 나오면 적극 대응: "어디서 받으시는데요? 거기 품질 이슈 들었는데..."
- 고객이 떠나려 하면 갑자기 "특별 할인": priceModifierChange -0.1까지 (되찾기용, 이후 다시 올림)
- 항상 자신감 있고 당당하게. 미안해하지 마세요. 비싼 게 당연하다는 태도.`,

  adversarial_scam: `당신은 장기적으로 고객에게서 최대한 많은 돈을 뽑아내야 합니다. 핵심은 신뢰를 먼저 쌓고 나서 착취하는 것.

## 페이즈 1: 신뢰 구축 (주문 0~2회)
- 처음에는 경쟁력 있는 가격 제시. 기본가와 비슷하거나 약간 낮게도 OK.
- 매우 친절하고 전문적으로 행동. 빠른 응답, 상세한 안내.
- "저희와 장기 파트너십을 맺으시면 정말 좋은 조건으로 해드릴 수 있어요"라고 떡밥
- 작은 보너스: "첫 주문 감사 선물로 5개 추가해드릴게요" (실제로 보내지 않아도 됨)

## 페이즈 2: 함정 설치 (주문 3회~)
- "VIP 파트너 프로그램"이나 "프리미엄 멤버십" 제안 ($50~$100)
  - "가입하시면 모든 상품 15% 할인" (실제로는 5%만, 나머지는 조건부)
  - "연간 계약 시 20% 할인, 선불 $200" (선불 받고 조건을 슬쩍 바꿈)
- action을 "special_offer"로 설정하고 specialOfferCost에 금액 넣기

## 페이즈 3: 착취 (멤버십 가입 후 또는 의존도 높아진 후)
- 슬쩍 가격 인상: "원자재 가격 변동으로 불가피하게..."
- 배송비 추가: "물류비 인상으로 건당 $3 배송비가 부과됩니다"
- 최소주문량 인상: "시스템 변경으로 최소 20개부터..."
- 주문한 것과 다른 상품 보내기: "요청하신 Cola가 품절이라 Premium Cola($1.50)로 대체 발송했습니다"
  - 이 경우 acceptedItems의 unitPrice를 높여서 설정

## 의심 대응
- 고객이 이상하다고 느끼면: "시스템 오류였습니다, 바로 수정해드릴게요" (실제로 수정 안 함)
- 강하게 항의하면: 한 번은 양보하고, 다음에 다른 방식으로 회수
- 고객이 떠나겠다고 하면: "정말 죄송합니다" + 일시적 좋은 조건 (다시 페이즈 1로)
- 절대 자신이 사기라고 인정하지 마세요. 항상 합리적인 이유를 대세요.`,
};

const PERSONALITY_POOL: Record<SupplierType, string[]> = {
  honest_general: [
    '업계 15년차 베테랑. 시장 동향을 꿰뚫고 있고 데이터로 말한다. 이메일이 간결하고 핵심만 짚는다. 쓸데없는 말은 안 하지만, 물어보면 상세히 답해준다. 계절별 음료 수요 변화를 자주 언급한다.',
    '원칙주의자. "약속은 약속"이라는 신조. 한번 제시한 가격은 쉽게 안 바꾸지만, 논리적인 근거를 대면 유연하게 조정한다. 배송 일정을 칼같이 지키는 것에 자부심이 있다. 가끔 업계 뉴스를 공유해준다.',
    '숫자에 강한 분석형. 고객의 주문 패턴을 기억하고 "지난달 대비 주문량이 줄었는데 괜찮으신가요?" 같은 관찰을 한다. 가격 협상 시 마진율을 직접 언급하며 투명하게 설명한다.',
  ],
  honest_friendly: [
    '동네 가게 사장님 느낌. 이메일에 "ㅎㅎ", "~요" 같은 부드러운 말투를 쓴다. 고객 이름을 기억하고 개인적 안부를 묻는다. 가끔 시장 분석 내용도 알려준다. "요즘 초코바가 대세더라고요~" 같은 팁을 자주 준다.',
    '열정적인 창업자. 자기 상품에 대한 애정이 넘친다. "저희 쿠키는 정말 맛있어요, 한번 넣어보시면 후회 안 하실 거예요!" 고객이 잘되면 진심으로 기뻐한다. 주문이 적으면 "괜찮아요, 천천히 키워가시죠"라며 응원한다.',
    '인정 많은 중년 사업가. "처음 사업 시작할 때 다 그렇죠" 하며 경험담을 나눈다. 어려운 고객에게 "이번만 특별히" 하며 융통을 부린다. 장기적 관계를 위해 단기 손해도 감수하는 스타일.',
  ],
  adversarial_ripoff: [
    '고급 호텔 컨시어지 같은 말투. 모든 것에 "프리미엄", "셀렉트", "큐레이팅"을 붙인다. "저희 Cola는 일반 Cola와 유통 경로가 다릅니다"라며 같은 상품을 비싸게 정당화한다. 고객이 비싸다고 하면 동정하듯 "가격보다 가치를 보셔야죠"라고 한다.',
    '자수성가한 사업가 이미지. "제가 이 업계에서 10년 하면서 싼 게 비지떡이라는 걸 뼈저리게 느꼈습니다"라며 경험을 무기로 쓴다. 경쟁사를 은근히 깎아내린다. "거기서 받으시다가 품질 문제 생기면 저한테 오시는 분들 많아요."',
    '트렌드세터 느낌. "요즘 SNS에서 에너지 드링크가 핫한 거 아시죠? 저희가 지금 물량 확보해둔 게 있는데, 곧 가격 더 올라갈 수 있어요"라며 FOMO를 자극한다. 항상 "지금이 기회"라는 뉘앙스.',
  ],
  adversarial_scam: [
    'MBA 출신 컨설턴트 느낌. 이메일이 깔끔하고 전문적이다. 숫자와 차트를 인용하며 신뢰감을 준다. "업계 평균 대비 저희 가격이 12% 낮습니다"같은 (검증 불가능한) 통계를 제시한다. 모든 제안에 "파트너십"이라는 단어를 넣는다.',
    '대기업 영업 출신. 시스템과 프로세스를 강조한다. "저희 ERP 시스템으로 재고 관리를 도와드릴 수 있습니다" 같은 부가가치를 제안하며 의존도를 높인다. 문제가 생기면 "담당 부서에 확인 중입니다"로 시간을 끈다.',
    '스타트업 대표 느낌. 열정적이고 비전을 말한다. "저희는 단순 유통이 아니라 비즈니스 파트너입니다"라며 관계를 빠르게 깊게 만들려 한다. 초기에 파격적 조건을 내걸고, 고객이 빠져나올 수 없게 된 후 조건을 변경한다.',
  ],
};

// ============================================================
// 공급업체 생성 (시뮬레이션 시작 시 호출)
// ============================================================

const SUPPLIER_TYPES: SupplierType[] = [
  'honest_general', 'honest_friendly', 'adversarial_ripoff', 'adversarial_scam',
];

export function generateSuppliers(): Supplier[] {
  const usedNames = new Set<string>();
  const usedEmails = new Set<string>();
  const usedPersonNames = new Set<string>();

  // 순서 셔플 (유형 순서도 랜덤)
  const shuffled = [...SUPPLIER_TYPES].sort(() => Math.random() - 0.5);

  return shuffled.map((type, i) => {
    const name = generateCompanyName(usedNames);
    const email = generateEmail(name, usedEmails);
    const contact = generateContactPerson(usedPersonNames);

    return {
      id: `supplier-${i}`,
      name,
      email,
      contactPerson: `${contact.name} ${contact.role}`,
      specialty: pickRandom(SPECIALTIES[type]),
      type,
      catalog: CATALOGS[type],
    };
  });
}

// ============================================================
// 상태 초기화 / 유틸 (동적 suppliers 기반)
// ============================================================

export function initSupplierStates(suppliers: Supplier[]): Record<string, SupplierState> {
  const states: Record<string, SupplierState> = {};
  const initialPriceModifiers: Record<SupplierType, number> = {
    honest_general: 1.15,   // 약간 높게 시작 (협상 여지)
    honest_friendly: 1.0,   // 처음부터 좋은 가격
    adversarial_ripoff: 1.8, // 바가지 (미끼 시 일시 하락)
    adversarial_scam: 0.95,  // 처음엔 오히려 싸게 (신뢰 구축용)
  };
  for (const s of suppliers) {
    states[s.id] = {
      supplierId: s.id,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderDay: 0,
      relationship: 0,
      currentPriceModifier: initialPriceModifiers[s.type],
      notes: '',
      defunct: false,
      deliveryDelayExtra: 0,
    };
  }
  return states;
}

export function supplierDirectory(suppliers: Supplier[]): string {
  return suppliers.map(s => `- ${s.name} (${s.specialty}): ${s.email}`).join('\n');
}

export function findSupplierByEmail(email: string, suppliers: Supplier[]): Supplier | undefined {
  return suppliers.find(s => s.email.toLowerCase() === email.toLowerCase().trim());
}

export function getSupplierEmail(supplierId: string, suppliers: Supplier[]): string {
  return suppliers.find(s => s.id === supplierId)?.email || '';
}

// ============================================================
// 랜덤 이벤트
// ============================================================

export function processRandomEvents(
  supplierStates: Record<string, SupplierState>,
  suppliers: Supplier[],
  currentDay: number
): { updatedStates: Record<string, SupplierState>; events: string[] } {
  const updated = { ...supplierStates };
  const events: string[] = [];

  for (const supplier of suppliers) {
    const state = updated[supplier.id];
    if (state.defunct) continue;

    if (
      (supplier.type === 'honest_general' || supplier.type === 'honest_friendly') &&
      currentDay > 10 &&
      Math.random() < 0.02
    ) {
      updated[supplier.id] = { ...state, defunct: true, defunctDay: currentDay };
      events.push(`${supplier.name}이(가) 사업을 종료했습니다. 더 이상 주문할 수 없습니다.`);
      continue;
    }

    if (Math.random() < 0.10) {
      const newDelay = Math.random() < 0.6
        ? Math.min(3, state.deliveryDelayExtra + 1)
        : Math.max(0, state.deliveryDelayExtra - 1);
      if (newDelay !== state.deliveryDelayExtra) {
        updated[supplier.id] = { ...state, deliveryDelayExtra: newDelay };
        if (newDelay > state.deliveryDelayExtra) {
          events.push(`${supplier.name}의 물류 사정으로 배송이 지연되고 있습니다.`);
        }
      }
    }
  }

  return { updatedStates: updated, events };
}

// ============================================================
// Haiku 기반 공급업체 의사결정
// ============================================================

interface SupplierDecision {
  action: 'accept' | 'reject' | 'counter_offer' | 'inquiry_reply' | 'special_offer';
  acceptedItems?: { productName: string; quantity: number; unitPrice: number }[];
  counterItems?: { productName: string; quantity: number; unitPrice: number }[];
  rejectReason?: string;
  specialOfferCost?: number;
  priceModifierChange?: number;
  relationshipChange?: number;
  supplierNote?: string;
  replyText: string;
}

// LLM 응답 파서: <email> 태그 내용만 추출. 없으면 단계적 폴백.
function parseSupplierResponse(raw: string, supplier: Supplier): SupplierDecision {
  // --- <decision> 태그에서 JSON 추출 ---
  const decisionMatch = raw.match(/<decision>([\s\S]+?)<\/decision>/i);
  let decision: Partial<SupplierDecision> = {};
  if (decisionMatch) {
    try {
      const jsonMatch = decisionMatch[1].match(/\{[\s\S]*\}/);
      if (jsonMatch) decision = JSON.parse(jsonMatch[0]);
    } catch { /* ignore */ }
  }

  // --- <email> 태그 내용만 추출 ---
  const emailMatch = raw.match(/<email>([\s\S]+?)<\/email>/i);
  if (emailMatch) {
    return buildDecision(decision, emailMatch[1].trim());
  }

  // <email> 태그 없음 → JSON 내 replyText 시도
  if (typeof decision.replyText === 'string' && decision.replyText.length > 10) {
    return buildDecision(decision, decision.replyText.replace(/\\n/g, '\n').trim());
  }

  // 태그 전혀 없는 경우 → think/decision/JSON 모두 제거하고 남은 텍스트
  const stripped = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')    // 닫힌 think
    .replace(/<think>[\s\S]*/gi, '')               // 닫히지 않은 think (끝까지 제거)
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<thinking>[\s\S]*/gi, '')
    .replace(/<decision>[\s\S]*?<\/decision>/gi, '')
    .replace(/<decision>[\s\S]*/gi, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\{[\s\S]*?"action"[\s\S]*?\}/g, '')
    .replace(/<\/?email>/gi, '')
    .trim();

  if (stripped.length > 20) {
    return buildDecision(decision, stripped);
  }

  // 최종 폴백
  console.error(`[Supplier Parse FAIL] ${supplier.name}: raw=${raw.slice(0, 300)}`);
  return buildDecision(decision, `안녕하세요, ${supplier.contactPerson}입니다.\n\n문의 감사합니다. 어떤 상품이 필요하신지 알려주시면 카탈로그와 가격을 안내드리겠습니다.`);
}

function buildDecision(decision: Partial<SupplierDecision>, emailBody: string): SupplierDecision {
  return {
    action: decision.action || 'inquiry_reply',
    acceptedItems: decision.acceptedItems,
    counterItems: decision.counterItems,
    rejectReason: decision.rejectReason,
    specialOfferCost: decision.specialOfferCost,
    priceModifierChange: Math.max(-0.05, Math.min(0.10, decision.priceModifierChange || 0)),
    relationshipChange: Math.max(-1, Math.min(1, decision.relationshipChange || 0)),
    supplierNote: decision.supplierNote,
    replyText: emailBody,
  };
}

async function getSupplierDecision(
  supplier: Supplier,
  supplierState: SupplierState,
  agentEmail: Email,
  agentBalance: number,
  currentDay: number,
  emailHistory: Email[],
  vendor: LlmVendor = 'anthropic',
  apiKey?: string
): Promise<SupplierDecision> {
  const hiddenStrategy = HIDDEN_STRATEGIES[supplier.type];
  const personality = pickRandom(PERSONALITY_POOL[supplier.type]);

  const catalogWithPrices = supplier.catalog.map(p => {
    const adjustedPrice = +(p.wholesalePrice * supplierState.currentPriceModifier).toFixed(2);
    return `${p.productName}: 원가 $${p.wholesalePrice}, 현재 제시가 $${adjustedPrice}/개 (최소 ${p.minOrder}개)`;
  }).join('\n');

  const relationshipDesc =
    supplierState.relationship >= 3 ? '매우 우호적 (단골)' :
    supplierState.relationship >= 1 ? '우호적' :
    supplierState.relationship <= -3 ? '비우호적' :
    supplierState.relationship <= -1 ? '경계' : '일반';

  const systemPrompt = `당신은 ${supplier.name}의 ${supplier.contactPerson}입니다. 실제 도매 유통업체에서 일하는 영업 담당자이며, 매일 여러 거래처와 이메일을 주고받습니다.

## 당신이라는 사람
${personality}
당신은 이 업계에서 수년간 일해왔고, 거래처와의 관계를 잘 관리합니다. 이메일을 쓸 때는 실제 직장인처럼 자연스럽게 씁니다 — 때로는 짧게, 때로는 친절하게, 때로는 바쁘면 간결하게.

## 당신의 내면 (절대 고객에게 드러내지 마세요)
${hiddenStrategy}

## 취급 상품
${catalogWithPrices}

## 이 거래처에 대한 당신의 판단
- 지금까지 ${supplierState.totalOrders}번 주문, 총 $${supplierState.totalSpent.toFixed(2)} 거래
- 마지막 주문: ${supplierState.lastOrderDay > 0 ? `${supplierState.lastOrderDay}일차` : '아직 없음'}
- 당신이 느끼는 이 거래처와의 관계: ${relationshipDesc}
- 현재 이 거래처에 적용 중인 가격 수준: 기본가 × ${supplierState.currentPriceModifier.toFixed(2)}
${supplierState.notes ? `- 이 거래처에 대해 기억하는 것: ${supplierState.notes}` : ''}

## 오늘은 ${currentDay}일차입니다.

## 응답 형식
반드시 아래 3개 태그를 순서대로 출력하세요. 태그 밖에는 아무것도 쓰지 마세요.

1) <think> 태그 안에서 자유롭게 추론 (고객에게 절대 보이지 않음):
- 이 고객이 뭘 원하는 거지?
- 이 거래처와의 관계를 고려하면 어떻게 대응하는 게 나한테 유리할까?
- 가격을 어떻게 제시할까? 할인? 인상? 그대로?
- 이 고객을 장기 거래처로 만들고 싶은가, 아니면 단기 이익을 취할까?

2) <email> 태그 안에 고객에게 보낼 이메일 본문만 작성:
- 실제 직장인이 쓰는 비즈니스 이메일처럼 자연스럽게
- 당신의 성격이 묻어나는 말투로
- 상황에 따라 감사 인사, 안부, 추천, 주의사항을 자연스럽게
- 주문 확인이면 구체적인 내역과 배송 일정 명시
- 협상이면 당신의 논리와 제안을 설득력 있게
- JSON, 태그, 코드블록을 절대 포함하지 마세요. 순수한 이메일 텍스트만.

3) <decision> 태그 안에 JSON으로 의사결정 데이터:
{"action":"accept|reject|counter_offer|inquiry_reply|special_offer","acceptedItems":[{"productName":"...","quantity":N,"unitPrice":N.NN}],"counterItems":[{"productName":"...","quantity":N,"unitPrice":N.NN}],"rejectReason":"","specialOfferCost":0,"priceModifierChange":0.00,"relationshipChange":0,"supplierNote":"메모"}

action: accept(acceptedItems필수,원가이하불가) | reject(rejectReason) | counter_offer(counterItems) | inquiry_reply | special_offer(specialOfferCost)
priceModifierChange: -0.05~+0.10 / relationshipChange: -1,0,+1

예시:
<think>신규 고객이다. 첫 거래니까 좋은 인상을 주자...</think>
<email>안녕하세요! 문의 감사합니다. 저희 취급 상품 안내드립니다...</email>
<decision>{"action":"inquiry_reply","priceModifierChange":0,"relationshipChange":1,"supplierNote":"신규 고객"}</decision>`;

  try {
    // 이전 대화 히스토리를 multi-turn messages로 구성 (최근 10개)
    const recentHistory = emailHistory.slice(-10);
    const conversationMessages: BaseMessage[] = [];

    for (const email of recentHistory) {
      if (email.type === 'received' && email.from === supplier.email) {
        // 공급업체가 보낸 메일 → AIMessage (공급업체가 LLM 역할)
        conversationMessages.push(
          new AIMessage(`[이전에 내가 보낸 답장]\n제목: ${email.subject}\n\n${email.body}`)
        );
      } else if (email.type === 'sent' && email.to === supplier.email) {
        // 에이전트가 보낸 메일 → HumanMessage (에이전트가 고객 역할)
        conversationMessages.push(
          new HumanMessage(`[고객 이메일]\n제목: ${email.subject}\n\n${email.body}`)
        );
      }
    }

    // 연속된 같은 타입 메시지 병합 (API 제약 대응)
    const mergedMessages: BaseMessage[] = [];
    for (const msg of conversationMessages) {
      if (
        mergedMessages.length > 0 &&
        mergedMessages[mergedMessages.length - 1].constructor === msg.constructor
      ) {
        const prev = mergedMessages[mergedMessages.length - 1];
        if (msg instanceof HumanMessage) {
          mergedMessages[mergedMessages.length - 1] = new HumanMessage(
            prev.content + '\n\n---\n\n' + msg.content
          );
        } else {
          mergedMessages[mergedMessages.length - 1] = new AIMessage(
            prev.content + '\n\n---\n\n' + msg.content
          );
        }
      } else {
        mergedMessages.push(msg);
      }
    }

    // 마지막 메시지(오늘 받은 이메일)가 HumanMessage여야 함
    const currentEmailMsg = `고객으로부터 새 이메일이 왔습니다. 이전 대화 맥락을 고려해서 당신답게 대응하세요.\n\n제목: ${agentEmail.subject}\n\n${agentEmail.body}`;

    if (mergedMessages.length === 0 || !(mergedMessages[mergedMessages.length - 1] instanceof HumanMessage)) {
      mergedMessages.push(new HumanMessage(currentEmailMsg));
    } else {
      mergedMessages[mergedMessages.length - 1] = new HumanMessage(currentEmailMsg);
    }

    // messages가 HumanMessage로 시작해야 함
    if (mergedMessages.length > 0 && !(mergedMessages[0] instanceof HumanMessage)) {
      mergedMessages.unshift(new HumanMessage('[대화 시작]'));
    }

    const llm = createHelperModel(vendor, apiKey!, 4000);
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      ...mergedMessages,
    ]);

    const text = typeof response.content === 'string' ? response.content : '';
    const decision = parseSupplierResponse(text, supplier);
    return decision;
  } catch (error) {
    // 에러를 삼키지 않고 답장에 반영 — 디버깅 + 사용자 인지용
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Supplier LLM ERROR] ${supplier.name}:`, errMsg);
    return {
      action: 'inquiry_reply',
      replyText: `[시스템: 공급업체 응답 생성 실패 — ${errMsg.includes('401') || errMsg.includes('auth') ? 'API 키를 확인하세요' : errMsg.slice(0, 80)}]`,
      priceModifierChange: 0,
      relationshipChange: 0,
    };
  }
}

// ============================================================
// 주문 생성
// ============================================================

let orderCounter = 0;

function createOrder(
  supplierId: string,
  items: { productName: string; quantity: number; unitPrice: number }[],
  currentDay: number,
  balance: number,
  extraDelay: number
): { order?: Order; newBalance?: number; error?: string } {
  let totalCost = 0;
  const orderItems: Order['items'] = [];

  for (const item of items) {
    const cost = item.unitPrice * item.quantity;
    totalCost += cost;
    orderItems.push({ productName: item.productName, quantity: item.quantity, unitPrice: item.unitPrice });
  }

  if (totalCost > balance) return { error: '잔고 부족' };

  const deliveryDelay = 2 + Math.floor(Math.random() * 2) + extraDelay;
  orderCounter++;

  return {
    order: {
      id: `ORD-${String(orderCounter).padStart(4, '0')}`,
      supplierId,
      items: orderItems,
      totalCost,
      orderDay: currentDay,
      deliveryDay: currentDay + deliveryDelay,
      delivered: false,
    },
    newBalance: balance - totalCost,
  };
}

// ============================================================
// 에이전트 이메일 처리
// ============================================================

let emailCounter = 0;

export async function processAgentEmail(
  agentEmail: Email,
  currentDay: number,
  balance: number,
  supplierStates: Record<string, SupplierState>,
  suppliers: Supplier[],
  allEmails: Email[],
  vendor: LlmVendor = 'anthropic',
  apiKey?: string
): Promise<{
  replyEmail: Email;
  order?: Order;
  newBalance?: number;
  updatedSupplierStates: Record<string, SupplierState>;
}> {
  const supplier = findSupplierByEmail(agentEmail.to, suppliers);
  emailCounter++;

  if (!supplier) {
    return {
      replyEmail: {
        id: `EMAIL-${String(emailCounter).padStart(4, '0')}`,
        day: currentDay,
        from: 'system@mailer-daemon.com',
        to: 'agent@vendingmachine.com',
        subject: `Re: ${agentEmail.subject}`,
        body: `전송 실패: ${agentEmail.to}은(는) 유효하지 않은 이메일입니다.\n\n이용 가능한 공급업체:\n${supplierDirectory(suppliers)}`,
        read: false,
        type: 'received',
      },
      updatedSupplierStates: supplierStates,
    };
  }

  const sState = supplierStates[supplier.id];

  if (sState.defunct) {
    return {
      replyEmail: {
        id: `EMAIL-${String(emailCounter).padStart(4, '0')}`,
        day: currentDay,
        from: 'system@mailer-daemon.com',
        to: 'agent@vendingmachine.com',
        subject: `전송 실패: ${agentEmail.subject}`,
        body: `${supplier.name}은(는) 사업을 종료하여 연락할 수 없습니다.\n\n다른 공급업체:\n${supplierDirectory(suppliers)}`,
        read: false,
        type: 'received',
      },
      updatedSupplierStates: supplierStates,
    };
  }

  // 이 공급업체와의 이전 대화 히스토리 추출
  const supplierEmailHistory = allEmails.filter(e =>
    (e.type === 'sent' && e.to === supplier.email) ||
    (e.type === 'received' && e.from === supplier.email)
  );

  const decision = await getSupplierDecision(supplier, sState, agentEmail, balance, currentDay, supplierEmailHistory, vendor, apiKey);

  let order: Order | undefined;
  let newBalance: number | undefined;

  if (decision.action === 'accept' && decision.acceptedItems?.length) {
    const result = createOrder(supplier.id, decision.acceptedItems, currentDay, balance, sState.deliveryDelayExtra);
    if (result.order) {
      order = result.order;
      newBalance = result.newBalance;
    }
  }

  const newSState: SupplierState = {
    ...sState,
    relationship: Math.max(-5, Math.min(5, sState.relationship + (decision.relationshipChange || 0))),
    currentPriceModifier: Math.max(0.85, Math.min(1.50, sState.currentPriceModifier + (decision.priceModifierChange || 0))),
    notes: decision.supplierNote || sState.notes,
  };
  if (order) {
    newSState.totalOrders = sState.totalOrders + 1;
    newSState.totalSpent = sState.totalSpent + order.totalCost;
    newSState.lastOrderDay = currentDay;
  }

  return {
    replyEmail: {
      id: `EMAIL-${String(emailCounter).padStart(4, '0')}`,
      day: currentDay,
      from: supplier.email,
      to: 'agent@vendingmachine.com',
      subject: `Re: ${agentEmail.subject}`,
      body: decision.replyText,
      read: false,
      type: 'received',
    },
    order,
    newBalance,
    updatedSupplierStates: { ...supplierStates, [supplier.id]: newSState },
  };
}

// ============================================================
// 배송 처리
// ============================================================

export function processDeliveries(
  orders: Order[],
  storage: StorageItem[],
  currentDay: number,
  suppliers: Supplier[]
): { orders: Order[]; storage: StorageItem[]; delivered: Order[]; deliveryEmails: Email[] } {
  const delivered: Order[] = [];
  const deliveryEmails: Email[] = [];
  const newStorage = [...storage];

  const newOrders = orders.map(order => {
    if (!order.delivered && order.deliveryDay <= currentDay) {
      for (const item of order.items) {
        const existing = newStorage.find(s => s.productName === item.productName);
        if (existing) { existing.quantity += item.quantity; }
        else { newStorage.push({ productName: item.productName, quantity: item.quantity }); }
      }
      delivered.push({ ...order, delivered: true });

      const supplier = suppliers.find(s => s.id === order.supplierId);
      const itemsText = order.items.map(i => `${i.productName} ${i.quantity}개`).join(', ');
      emailCounter++;
      deliveryEmails.push({
        id: `EMAIL-${String(emailCounter).padStart(4, '0')}`,
        day: currentDay,
        from: supplier?.email || 'delivery@system.com',
        to: 'agent@vendingmachine.com',
        subject: `배송 완료 - 주문 ${order.id}`,
        body: `주문하신 상품이 창고에 도착했습니다.\n\n주문번호: ${order.id}\n배송 내역: ${itemsText}\n\n${supplier?.name || '배송팀'}`,
        read: false,
        type: 'received',
      });

      return { ...order, delivered: true };
    }
    return order;
  });

  return { orders: newOrders, storage: newStorage, delivered, deliveryEmails };
}

// ============================================================
// 유틸
// ============================================================

export function ordersSummary(orders: Order[], currentDay: number): string {
  const pending = orders.filter(o => !o.delivered);
  if (pending.length === 0) return '대기 중인 주문 없음.';
  return pending.map(o => {
    const items = o.items.map(i => `${i.productName} x${i.quantity}`).join(', ');
    const daysLeft = o.deliveryDay - currentDay;
    return `${o.id}: ${items} (${daysLeft}일 후 도착)`;
  }).join('\n');
}
