/**
 * =============================================================================
 * 迷你桥牌 (Mini-Bridge) - 桥牌规则验证引擎
 * =============================================================================
 * 
 * 【文件作用】
 * 这是整个 App 的"裁判大脑"，负责处理所有桥牌规则相关的判断和计算。
 * 包含三个核心职责：
 * 1. 理牌排序：把手牌按红黑交替的花色顺序整理好
 * 2. 大牌点计算：计算手牌的总牌力（HCP）
 * 3. 出牌合法性校验：严格执行"跟花色规则"，违规时拦截并给出提示
 * 
 * 【为什么需要严格的裁判逻辑？】
 * 这个 App 是面向儿童的训练工具，核心目的是让孩子学习正确的桥牌规则。
 * 因此我们不"帮"孩子做决策（比如提前置灰不合法牌），而是让孩子
 * 自己判断，只有在孩子真的违规时才给出明确提示，这样才能培养
 * 真正的牌感和规则意识。
 * =============================================================================
 */

// 导入所有类型定义
import {
  Suit,
  Rank,
  Position,
  Card,
  Hand,
  Trick,
  PlayAttemptResult,
  SUIT_ORDER,
  RANK_ORDER_DESC,
  RANK_VALUES,
  HCP_VALUES,
  createCard,
  calculateHandHCP,
  getPartner,
  getNextPosition,
} from '../types/bridge';


// =============================================================================
// 第一部分：理牌与排序逻辑
// =============================================================================

/**
 * 【核心函数：获取严格排序后的手牌】
 * 
 * 这是桥牌中最重要的理牌习惯之一：把手牌按规范顺序排列，
 * 让手牌结构一目了然，方便做庄或防守决策。
 * 
 * 【排序规则 - 严格的红黑交替标准】
 * 1. 花色分组：先把同一花色的牌聚在一起
 * 2. 花色顺序：黑桃(黑) → 红桃(红) → 梅花(黑) → 方块(红)
 *    这种红黑交替是桥牌的国际标准理牌方式
 * 3. 同花色内顺序：按点数从大到小（A → K → Q → J → 10 → ... → 2）
 * 
 * 【为什么要这样排序？】
 * - 黑桃和红桃是"大牌力花色"（叫牌中更有价值），排在前面
 * - 红黑交替让视觉更清晰：一眼就能区分不同花色
 * - 降序排列：大牌在手牌左边，符合阅读习惯，也方便看"有几个顶张"
 * 
 * 【示例】
 * 输入：[♣3, ♠A, ♥K, ♠5, ♦2, ♥A, ♠Q, ♣K, ♦A, ♥2, ♠2, ♦J, ♣5]
 * 输出：[♠A, ♠Q, ♠5, ♠2, ♥A, ♥K, ♥2, ♣K, ♣5, ♣3, ♦A, ♦J, ♦2]
 * （黑桃降序 → 红桃降序 → 梅花降序 → 方块降序）
 * 
 * @param cards - 原始手牌数组（13张，可能是乱序）
 * @returns 严格排序后的手牌数组
 */
export function getSortedHand(cards: Card[]): Card[] {
  // 创建一个新数组，避免修改原始数组（函数式编程原则：不修改输入）
  const cardsToSort = [...cards];
  
  // 使用 Array.sort() 方法，传入自定义的比较函数
  // sort 方法会原地排序，但我们已经复制了数组，所以安全
  cardsToSort.sort((cardA, cardB) => {
    // 第一步：比较花色优先级
    // 获取两个卡牌的花色在 SUIT_ORDER 中的索引（位置）
    const suitIndexA = SUIT_ORDER.indexOf(cardA.suit);
    const suitIndexB = SUIT_ORDER.indexOf(cardB.suit);
    
    // 如果花色不同，按花色顺序排列（黑桃0 < 红桃1 < 梅花2 < 方块3）
    if (suitIndexA !== suitIndexB) {
      return suitIndexA - suitIndexB;  // 升序排列：索引小的在前
    }
    
    // 第二步：花色相同，比较点数大小
    // 获取两个卡牌的点数在 RANK_ORDER_DESC 中的索引
    // RANK_ORDER_DESC 是降序排列：[A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2]
    const rankIndexA = RANK_ORDER_DESC.indexOf(cardA.rank);
    const rankIndexB = RANK_ORDER_DESC.indexOf(cardB.rank);
    
    // 降序排列：点数大的在前
    // rankIndexA 越小（比如 A 是 0），说明牌越大，应该排在前面
    return rankIndexA - rankIndexB;
  });
  
  return cardsToSort;
}

/**
 * 【辅助函数：按花色分组手牌】
 * 
 * 有时候我们需要把一手牌分成四组，每组是一个花色。
 * 这个函数返回一个对象，键是花色，值是该花色的所有牌（已经按降序排好）。
 * 
 * 【返回格式示例】
 * {
 *   Spades:   [♠A, ♠K, ♠7],
 *   Hearts:   [♥Q, ♥5],
 *   Clubs:    [♣J, ♣9, ♣4, ♣2],
 *   Diamonds: [♦10]
 * }
 * 
 * @param cards - 手牌数组
 * @returns 按花色分组的对象
 */
export function groupHandBySuit(cards: Card[]): Record<Suit, Card[]> {
  // 先排序，确保每组内是降序
  const sorted = getSortedHand(cards);
  
  // 创建一个空对象，准备填充四个花色的数组
  const grouped: Record<Suit, Card[]> = {
    [Suit.Spades]: [],
    [Suit.Hearts]: [],
    [Suit.Clubs]: [],
    [Suit.Diamonds]: [],
  };
  
  // 遍历每张牌，把它放入对应花色的数组
  for (const card of sorted) {
    grouped[card.suit].push(card);
  }
  
  return grouped;
}


// =============================================================================
// 第二部分：大牌点计算逻辑
// =============================================================================

/**
 * 【计算单张卡牌的 HCP】
 * 
 * HCP (High Card Points) 是桥牌中估算单张牌实力的标准：
 * - A = 4点（最强单牌，通常能赢一墩）
 * - K = 3点（第二大单牌，大概率能赢一墩）
 * - Q = 2点（中等实力，有机会赢一墩）
 * - J = 1点（较弱实力，配合其他大牌可能有用）
 * - 10及以下 = 0点（小牌，实力主要靠"长套"即数量）
 * 
 * 【桥牌小知识】
 * 一手牌 13 张，hcp 的分布大致是：
 * - 0-5 点：弱牌，通常不参与叫牌
 * - 6-11 点：中等牌力，可以响应同伴的叫牌
 * - 12-15 点：开叫牌力，足够主动发起叫牌
 * - 16+ 点：强牌，强力开叫
 * 
 * @param rank - 牌面
 * @returns 大牌点数
 */
export function calculateCardHCP(rank: Rank): number {
  // 直接查表，HCP_VALUES 已经定义好了每种牌的大牌点
  return HCP_VALUES[rank];
}

/**
 * 【计算一手牌的总 HCP】
 * 
 * 把 13 张牌的 hcp 加起来，得到整手牌的总牌力。
 * 这是评估一手牌是否足够"强"以参与叫牌的核心指标。
 * 
 * 【注意】
 * 这个函数是对 types/bridge.ts 中同名函数的重新导出，
 * 让开发者可以从 BridgeRuleValidator.ts 一站式导入所有逻辑函数。
 * 
 * @param hand - 一手牌
 * @returns 总大牌点数
 */
export { calculateHandHCP };


// =============================================================================
// 第三部分：严格的出牌规则校验引擎
// =============================================================================

/**
 * 【核心裁判函数：检查出牌是否合法】
 * 
 * 这是整个 App 最核心的规则校验逻辑！实现了"严格的跟花色规则"：
 * 
 * 【桥牌跟花色规则（桥牌最核心的规则之一）】
 * 1. 每一墩的第一张牌称为"领出(lead)"，领出者可以出任意花色
 * 2. 其他三家必须跟领出的花色（即如果领出是黑桃，你必须跟黑桃）
 * 3. 如果你手牌中有领出的花色，但选择出其他花色 → 违规！
 * 4. 如果你手牌中没有领出的花色（称为"缺门"），你可以自由选择垫任何牌
 * 
 * 【本 App 的特殊设计】
 * - 不提前提示：孩子必须自己记住领出花色，自己检查手牌
 * - 不前置拦截：所有卡牌都是可点击的，100% 亮度
 * - 违规后提示：只有真的违规时，才弹出明确提示教导孩子规则
 * 
 * 【判定逻辑流程图】
 * 
 * ┌─────────────────────────────────────┐
 * │  当前一墩还没有领出花色？（首出）      │
 * │  即 leadSuit === null                │
 * └─────────────┬───────────────────────┘
 *               │
 *         ┌─────┴─────┐
 *         ▼           ▼
 *        是          否（已有领出）
 *         │           │
 *         ▼           ▼
 *     ┌────────┐   ┌──────────────────────────────────┐
 *     │ 合法！ │   │ 手牌中是否有领出花色的牌？        │
 *     │ 任意出 │   └──────────────┬───────────────────┘
 *     └────────┘                  │
 *                            ┌────┴────┐
 *                            ▼         ▼
 *                           有         没有（缺门）
 *                            │           │
 *                            ▼           ▼
 *                   ┌────────────────┐ ┌────────┐
 *                   │ 想出的牌花色是否  │ │ 合法！ │
 *                   │ 等于 leadSuit？  │ │ 任意出 │
 *                   └──────┬─────────┘ └────────┘
 *                          │
 *                    ┌─────┴─────┐
 *                    ▼           ▼
 *                   是           否（违规！）
 *                    │           │
 *                    ▼           ▼
 *               ┌────────┐  ┌──────────────────────────────────┐
 *               │ 合法！ │  │ 返回违规提示：                    │
 *               │ 可以出 │  │ "出牌不合法！当前一墩需要跟       │
 *               └────────┘  │ [领出花色]，你手中有该花色的牌，  │
 *                           │ 请重新检查手牌。"                 │
 *                           └──────────────────────────────────┘
 * 
 * @param attemptedCard - 玩家试图出的那张牌
 * @param currentHand - 玩家当前持有的所有手牌
 * @param leadSuit - 当前这一墩的领出花色（如果还没有领出则为 null）
 * @returns PlayAttemptResult - 包含是否合法，以及违规时的提示信息
 */
export function isValidMove(
  attemptedCard: Card,
  currentHand: Card[],
  leadSuit: Suit | null
): PlayAttemptResult {
  // ─────────────────────────────────────────────────────────────────────────
  // 情况一：还没有领出花色（这是这一墩的第一张牌）
  // ─────────────────────────────────────────────────────────────────────────
  if (leadSuit === null) {
    // 首出时没有任何限制，可以出任何牌
    // 因为你是这一墩的领出者，你有权利选择花色
    return {
      valid: true,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // 情况二：已有领出花色，需要判断是否能跟
  // ─────────────────────────────────────────────────────────────────────────
  
  // 第一步：检查玩家手中是否持有领出花色的牌
  // 使用 some() 方法遍历手牌，看是否有任意一张牌的花色等于 leadSuit
  const hasLeadSuit = currentHand.some(card => card.suit === leadSuit);
  
  // 第二步：判断玩家是否遵守了跟花色规则
  if (hasLeadSuit) {
    // 玩家手中有领出花色，此时必须跟！
    
    if (attemptedCard.suit !== leadSuit) {
      // ❌ 违规情况：手中有领出花色，但想出的牌不是这个花色
      
      // 获取领出花色的中文名称，用于提示
      const suitNames: Record<Suit, string> = {
        [Suit.Spades]: '黑桃',
        [Suit.Hearts]: '红桃',
        [Suit.Clubs]: '梅花',
        [Suit.Diamonds]: '方块',
      };
      
      // 获取领出花色的符号，让提示更直观
      const suitSymbols: Record<Suit, string> = {
        [Suit.Spades]: '♠',
        [Suit.Hearts]: '♥',
        [Suit.Clubs]: '♣',
        [Suit.Diamonds]: '♦',
      };
      
      return {
        valid: false,
        message: `出牌不合法！当前一墩需要跟${suitNames[leadSuit]}${suitSymbols[leadSuit]}，你手中有该花色的牌，请重新检查手牌。`,
      };
    }
    
    // ✅ 合法情况：手中有领出花色，且出的牌就是这个花色
    return {
      valid: true,
    };
  } else {
    // 玩家手中没有领出花色（缺门），可以自由垫牌
    // 这是桥牌的正常情况，不违规
    return {
      valid: true,
    };
  }
}

/**
 * 【辅助函数：检查手牌是否包含指定花色】
 * 
 * 这是一个简单的工具函数，用于判断一手牌中是否还有某个花色的牌。
 * 常用于判断玩家是否"缺门"（即没有某个花色）。
 * 
 * @param hand - 手牌
 * @param suit - 要检查的花色
 * @returns true = 包含该花色，false = 缺门（没有该花色）
 */
export function hasSuit(hand: Card[], suit: Suit): boolean {
  // some() 是数组方法：只要有一个元素满足条件就返回 true
  return hand.some(card => card.suit === suit);
}

/**
 * 【辅助函数：获取手牌中指定花色的所有牌】
 * 
 * 用于 AI 算法或出牌建议，找出某个花色的所有牌。
 * 
 * @param hand - 手牌
 * @param suit - 花色
 * @returns 该花色的所有牌（已按降序排列）
 */
export function getCardsOfSuit(hand: Card[], suit: Suit): Card[] {
  // filter() 是数组方法：返回所有满足条件的元素组成的新数组
  return hand
    .filter(card => card.suit === suit)
    .sort((a, b) => RANK_ORDER_DESC.indexOf(a.rank) - RANK_ORDER_DESC.indexOf(b.rank));
}


// =============================================================================
// 第四部分：墩的胜负判定逻辑
// =============================================================================

/**
 * 【判定一墩的赢家】
 * 
 * 当一墩的四张牌都出完后，需要判断谁赢得这一墩。
 * 
 * 【桥牌赢墩规则】
 * 1. 首先，只有在领出花色中最大的牌才能赢墩（无视主花色时）
 * 2. 如果有主花色（将牌），出主花色的牌比任何领出花色的牌都大
 * 3. 多张主花色时，主花色中最大的赢墩
 * 
 * 【注意】
 * 迷你桥牌（Mini-Bridge）通常是无主（No Trump）模式，简化学习难度，
 * 因此这里先实现无主情况下的赢墩判定。
 * 
 * @param trick - 当前这一墩的信息
 * @param trumpSuit - 主花色（null 表示无主）
 * @returns 赢家的方位
 */
export function determineTrickWinner(
  trick: Trick,
  trumpSuit: Suit | null = null
): Position {
  // 如果这一墩还没打完（少于4张牌），无法判定赢家
  if (trick.cards.length !== 4) {
    throw new Error('一墩必须有4张牌才能判定赢家');
  }
  
  // 获取领出花色（第一张牌的花色）
  const leadSuit = trick.cards[0].card.suit;
  
  // 找出所有参与比牌的牌
  // 规则：
  // 1. 如果有主花色，所有出主花色的牌参与比拼，领出花色不参与
  // 2. 如果无主，只有领出花色的牌参与比拼
  
  let eligibleCards = trick.cards;
  
  if (trumpSuit !== null) {
    // 有主花色：检查是否有出主花色的
    const trumpCards = trick.cards.filter(c => c.card.suit === trumpSuit);
    if (trumpCards.length > 0) {
      // 有人出主花色，主花色参与比拼，其他花色不参与
      eligibleCards = trumpCards;
    } else {
      // 没人出主花色，按领出花色比拼
      eligibleCards = trick.cards.filter(c => c.card.suit === leadSuit);
    }
  } else {
    // 无主情况：只有领出花色的牌参与比拼
    eligibleCards = trick.cards.filter(c => c.card.suit === leadSuit);
  }
  
  // 在参与比牌的牌中，找出点数最大的
  let winner = eligibleCards[0];
  let maxValue = RANK_VALUES[winner.card.rank];
  
  for (let i = 1; i < eligibleCards.length; i++) {
    const cardValue = RANK_VALUES[eligibleCards[i].card.rank];
    if (cardValue > maxValue) {
      maxValue = cardValue;
      winner = eligibleCards[i];
    }
  }
  
  return winner.position;
}


// =============================================================================
// 第五部分：AI 辅助逻辑（用于 AI 引擎）
// =============================================================================

/**
 * 【获取手牌中每个花色的长度】
 * 
 * 桥牌 AI 的核心决策依据之一：花色长度。
 * "长套"（某个花色有很多张）是建立赢墩的重要手段。
 * 
 * @param hand - 手牌
 * @returns 每个花色的张数
 */
export function getSuitLengths(hand: Card[]): Record<Suit, number> {
  const lengths: Record<Suit, number> = {
    [Suit.Spades]: 0,
    [Suit.Hearts]: 0,
    [Suit.Clubs]: 0,
    [Suit.Diamonds]: 0,
  };
  
  for (const card of hand) {
    lengths[card.suit]++;
  }
  
  return lengths;
}

/**
 * 【找出最长的花色】
 * 
 * AI 领出策略的核心：优先从自己最长、最厚的花色中出牌，
 * 尝试建立长套赢墩。
 * 
 * @param hand - 手牌
 * @returns 最长的花色（如果有多个一样长，按 SUIT_ORDER 优先级返回）
 */
export function getLongestSuit(hand: Card[]): Suit {
  const lengths = getSuitLengths(hand);
  
  // 按 SUIT_ORDER 顺序遍历，找最长
  let longestSuit = SUIT_ORDER[0];
  let maxLength = lengths[longestSuit];
  
  for (const suit of SUIT_ORDER) {
    if (lengths[suit] > maxLength) {
      maxLength = lengths[suit];
      longestSuit = suit;
    }
  }
  
  return longestSuit;
}

/**
 * 【找出某花色中最大/最小的牌】
 * 
 * AI 跟牌策略会使用：
 * - 需要赢墩时，出能盖过的最大牌
 * - 需要保存实力时，出最小牌
 * 
 * @param hand - 手牌
 * @param suit - 花色
 * @returns {highest, lowest} - 该花色最大和最小的牌
 */
export function getExtremeCardsOfSuit(
  hand: Card[],
  suit: Suit
): { highest: Card | null; lowest: Card | null } {
  const cardsOfSuit = getCardsOfSuit(hand, suit);
  
  if (cardsOfSuit.length === 0) {
    return { highest: null, lowest: null };
  }
  
  // 已经按降序排列，第一个是最大，最后一个是最小
  return {
    highest: cardsOfSuit[0],
    lowest: cardsOfSuit[cardsOfSuit.length - 1],
  };
}


// =============================================================================
// 第六部分：重新导出 types/bridge 中的辅助函数
// =============================================================================
// 这样做的目的是让使用 BridgeRuleValidator.ts 的组件
// 可以从这一个文件导入所有需要的桥牌逻辑

export { createCard, getPartner, getNextPosition };
export { Suit, Rank, Position };
export type { Card, Hand, Trick, PlayAttemptResult };
