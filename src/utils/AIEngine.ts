/**
 * =============================================================================
 * 迷你桥牌 (Mini-Bridge) - AI 陪练引擎
 * =============================================================================
 * 
 * 【文件作用】
 * 这是三个 AI 对手（West、East、以及可能的 North/South 明手）的"大脑"。
 * 实现了高直觉的桥牌策略算法，让 AI 的行为接近人类中级玩家的思考方式。
 * 
 * 【设计原则】
 * 1. 领出策略：优先从最长花色出大牌，尝试建立长套赢墩
 * 2. 跟牌策略：能赢则赢，不能赢则垫小牌保存实力
 * 3. 简单直观：避免复杂的概率计算，用清晰的规则让 AI 行为可预测
 * 
 * 【AI 决策的两个场景】
 * 
 * 场景一：领出（Lead）- AI 是第一张出牌的人
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ 1. 找出自己手牌中最长的花色（张数最多）                              │
 * │ 2. 如果有多个一样长的，优先大牌力花色（♠ > ♥ > ♣ > ♦）               │
 * │ 3. 从这个花色中出最大的牌                                            │
 * │    理由：出大牌可以试探该花色的分布，也可能直接赢墩                   │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * 场景二：跟牌（Follow）- 已有领出花色，AI 必须跟牌或垫牌
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ 1. 检查自己是否持有领出花色                                          │
 * │    ├── 有领出花色 → 必须从该花色出                                    │
 * │    │   ├── 同伴目前牌面最大（或还没人出）                            │
 * │    │   │   └── 垫该花色最小的牌（不浪费大牌）                        │
 * │    │   └── 敌方牌面最大，且我有更大的牌可以盖过                       │
 * │    │       └── 出能盖过的最小大牌（赢下这墩）                        │
 * │    │   └── 敌方牌面最大，但我盖不过                                  │
 * │    │       └── 垫该花色最小的牌（保存实力）                          │
 * │    └── 没有领出花色（缺门）→ 可以自由垫任何牌                         │
 * │        └── 优先垫小牌（大牌留着以后用）                              │
 * └─────────────────────────────────────────────────────────────────────┘
 * =============================================================================
 */

// 导入类型定义
import {
  Suit,
  Rank,
  Position,
  Card,
  Hand,
  Trick,
  RANK_VALUES,
  RANK_ORDER_DESC,
  SUIT_ORDER,
} from '../types/bridge';

// 导入工具函数（来自 BridgeRuleValidator）
import {
  getSuitLengths,
  getLongestSuit,
  getCardsOfSuit,
  getExtremeCardsOfSuit,
  hasSuit,
  determineTrickWinner,
} from './BridgeRuleValidator';

// =============================================================================
// 第一部分：领出策略（Lead Strategy）
// =============================================================================

/**
 * 【AI 领出决策】
 * 
 * 当 AI 是这一墩第一个出牌时，选择哪张牌领出。
 * 
 * 【策略逻辑】
 * 1. 找出最长花色（张数最多）
 * 2. 从最长花色中出最大的牌
 * 
 * 【桥牌原理】
 * - 长套是赢墩的重要来源：如果你有 5 张 ♠，对手只有 3 张，
 *   等大牌出完后，你剩下的小牌都能赢墩
 * - 从长套出大牌，可以快速试探该花色的分布
 * 
 * @param hand - AI 的当前手牌
 * @returns 决定出的卡牌
 */
export function selectLeadCard(hand: Hand): Card | null {
  // 【防御性编程】手牌为空时返回 null（游戏结束场景）
  if (!hand || hand.length === 0) {
    console.warn('AI: 手牌为空，无法出牌（游戏可能已结束）');
    return null;
  }

  // 第一步：找出最长的花色
  const longestSuit = getLongestSuit(hand);

  // 第二步：获取该花色的所有牌（已经按降序排列）
  const cardsInLongestSuit = getCardsOfSuit(hand, longestSuit);

  // 【防御性编程】确保有牌可出
  if (!cardsInLongestSuit || cardsInLongestSuit.length === 0) {
    console.warn('AI: 最长花色中没有牌，使用第一张手牌');
    return hand[0];
  }

  // 第三步：出这个花色中最大的牌
  // 因为 getCardsOfSuit 已经按降序排列，所以第一个就是最大的
  return cardsInLongestSuit[0];
}

// =============================================================================
// 第二部分：跟牌策略（Follow Strategy）
// =============================================================================

/**
 * 【AI 跟牌决策】
 * 
 * 当 AI 不是第一个出牌时，根据领出花色和当前墩的情况选择跟牌。
 * 
 * 【核心逻辑】
 * 1. 如果有领出花色，必须从该花色出（桥牌规则强制）
 * 2. 判断当前墩的形势：同伴领先？敌方领先？
 * 3. 决定是争取赢墩还是垫小牌保存实力
 * 
 * @param hand - AI 的当前手牌
 * @param trick - 当前这一墩的状态（已出的牌）
 * @param leadSuit - 领出花色
 * @param myPosition - AI 的方位
 * @param partnerPosition - AI 队友的方位
 * @returns 决定出的卡牌
 */
export function selectFollowCard(
  hand: Hand,
  trick: Trick,
  leadSuit: Suit,
  myPosition: Position,
  partnerPosition: Position
): Card | null {
  // 第一步：检查是否持有领出花色
  const hasLeadSuit = hasSuit(hand, leadSuit);
  
  if (!hasLeadSuit) {
    // ─────────────────────────────────────────────────────────────────────
    // 情况一：缺门（没有领出花色）
    // ─────────────────────────────────────────────────────────────────────
    // 可以自由垫任何牌，优先垫小牌
    return selectDiscardCard(hand);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // 情况二：持有领出花色，必须从该花色出
  // ─────────────────────────────────────────────────────────────────────────

  // 获取领出花色的所有牌
  const leadSuitCards = getCardsOfSuit(hand, leadSuit);

  // 【防御性编程】确保领出花色的牌存在
  if (!leadSuitCards || leadSuitCards.length === 0) {
    console.warn(`AI selectFollowCard: 领出花色 ${leadSuit} 无牌可出，回退到垫牌`);
    return selectDiscardCard(hand);
  }

  // 分析当前墩的形势
  const currentTopCard = getCurrentWinningCard(trick, leadSuit);
  const isPartnerWinning = currentTopCard &&
    getCardOwner(trick, currentTopCard) === partnerPosition;
  const isEnemyWinning = currentTopCard &&
    getCardOwner(trick, currentTopCard) !== myPosition &&
    getCardOwner(trick, currentTopCard) !== partnerPosition;

  // 我能出的最大牌
  const myHighest = leadSuitCards[0];
  const myHighestValue = RANK_VALUES[myHighest.rank];
  
  // 当前场上最大牌的点数
  const currentTopValue = currentTopCard ? RANK_VALUES[currentTopCard.rank] : 0;
  
  // 决策逻辑
  if (!currentTopCard || isPartnerWinning) {
    // ─────────────────────────────────────────────────────────────────────
    // 子情况 A：同伴目前最大，或还没人出（我是第二个出牌）
    // ─────────────────────────────────────────────────────────────────────
    // 策略：垫最小的牌，不浪费大牌，让同伴去赢
    // 除非我的大牌一定能赢且有必要（比如防止敌方大牌下来）
    return leadSuitCards[leadSuitCards.length - 1];  // 最小的
  } else if (isEnemyWinning) {
    // ─────────────────────────────────────────────────────────────────────
    // 子情况 B：敌方目前最大
    // ─────────────────────────────────────────────────────────────────────
    if (myHighestValue > currentTopValue) {
      // 我有更大的牌，可以盖过！出能盖过的最小牌
      // 从大到小遍历，找到第一个能盖过的
      for (const card of leadSuitCards) {
        if (RANK_VALUES[card.rank] > currentTopValue) {
          return card;
        }
      }
    }
    // 盖不过，垫最小的保存实力
    return leadSuitCards[leadSuitCards.length - 1];
  } else {
    // 我自己目前是最大（不太可能，因为是跟牌），垫最小的
    return leadSuitCards[leadSuitCards.length - 1];
  }
}

// =============================================================================
// 第三部分：垫牌策略（Discard Strategy）
// =============================================================================

/**
 * 【AI 垫牌决策】
 * 
 * 当 AI 缺门（没有领出花色）时，选择垫哪张牌。
 * 也适用于明手或防守时的弃牌。
 * 
 * 【策略】
 * 1. 优先垫大牌点最小的花色（即废物花色）
 * 2. 从该花色中垫最小的牌
 * 
 * 【桥牌原理】
 * - 垫牌的原则是"放弃没有价值的花色"，保留有赢墩潜力的花色
 * - 短套（只有 1-2 张）通常优先垫，因为很难建立赢墩
 * 
 * @param hand - AI 的当前手牌
 * @returns 决定垫的卡牌
 */
export function selectDiscardCard(hand: Hand): Card | null {
  // 【防御性编程】检查手牌
  if (!hand || hand.length === 0) {
    console.warn('AI selectDiscardCard: 手牌为空');
    return null;
  }

  // 第一步：计算每个花色的"价值"
  // 价值 = 大牌点总和 + 长度惩罚（越短越优先垫）
  const suitValues: Record<Suit, number> = {
    [Suit.Spades]: 0,
    [Suit.Hearts]: 0,
    [Suit.Clubs]: 0,
    [Suit.Diamonds]: 0,
  };

  // 计算每个花色的 HCP 总和
  for (const card of hand) {
    suitValues[card.suit] += card.hcp;
  }

  // 长度惩罚：每个花色张数 * -0.5
  // 这样短套会得到负分，更容易被选为垫牌花色
  const lengths = getSuitLengths(hand);
  for (const suit of SUIT_ORDER) {
    suitValues[suit] += lengths[suit] * (-0.5);
  }

  // 第二步：找出价值最低的花色
  let discardSuit = SUIT_ORDER[0];
  let lowestValue = suitValues[discardSuit];

  for (const suit of SUIT_ORDER) {
    if (suitValues[suit] < lowestValue) {
      lowestValue = suitValues[suit];
      discardSuit = suit;
    }
  }

  // 第三步：从这个花色中垫最小的牌
  const cardsInDiscardSuit = getCardsOfSuit(hand, discardSuit);

  // 【防御性编程】确保有牌可垫
  if (!cardsInDiscardSuit || cardsInDiscardSuit.length === 0) {
    // 回退：直接返回手牌中最小的一张
    return hand[hand.length - 1];
  }

  return cardsInDiscardSuit[cardsInDiscardSuit.length - 1];  // 最小的
}

// =============================================================================
// 第四部分：辅助函数
// =============================================================================

/**
 * 【获取当前墩中最大的牌】
 * 
 * 分析当前已出的牌，找出在领出花色中最大的那张。
 * 注意：迷你桥牌先实现无主（No Trump）逻辑。
 * 
 * @param trick - 当前墩
 * @param leadSuit - 领出花色
 * @returns 当前最大的牌，或 null（如果还没出牌）
 */
function getCurrentWinningCard(trick: Trick, leadSuit: Suit): Card | null {
  if (trick.cards.length === 0) {
    return null;
  }
  
  // 只考虑领出花色的牌
  const leadSuitPlays = trick.cards.filter(play => play.card.suit === leadSuit);
  
  if (leadSuitPlays.length === 0) {
    return null;
  }
  
  // 找出最大的
  let winningCard = leadSuitPlays[0].card;
  let maxValue = RANK_VALUES[winningCard.rank];
  
  for (const play of leadSuitPlays) {
    const value = RANK_VALUES[play.card.rank];
    if (value > maxValue) {
      maxValue = value;
      winningCard = play.card;
    }
  }
  
  return winningCard;
}

/**
 * 【获取某张牌的出牌者】
 * 
 * @param trick - 当前墩
 * @param card - 要找的牌
 * @returns 出牌者的方位
 */
function getCardOwner(trick: Trick, card: Card): Position {
  const play = trick.cards.find(c => 
    c.card.suit === card.suit && c.card.rank === card.rank
  );
  if (!play) {
    throw new Error('牌不在当前墩中');
  }
  return play.position;
}

// =============================================================================
// 第五部分：统一 AI 决策入口
// =============================================================================

/**
 * 【AI 统一决策入口】
 * 
 * 这是 AI 引擎的主函数，传入当前游戏状态，返回 AI 决定出的牌。
 * 
 * @param hand - AI 的手牌
 * @param trick - 当前墩状态
 * @param myPosition - AI 的方位
 * @param partnerPosition - AI 队友的方位
 * @returns AI 选择出的卡牌
 */
export function makeAIDecision(
  hand: Hand,
  trick: Trick,
  myPosition: Position,
  partnerPosition: Position
): Card | null {
  // 【防御性编程】手牌为空时返回 null
  if (!hand || hand.length === 0) {
    console.warn(`AI: ${myPosition} 手牌为空，无法决策`);
    return null;
  }

  // 判断是领出还是跟牌
  const isLead = trick.cards.length === 0;

  if (isLead) {
    // 领出场景
    return selectLeadCard(hand);
  } else {
    // 跟牌场景
    // 【防御性编程】确保墩中有牌，避免访问 undefined
    if (!trick.cards[0] || !trick.cards[0].card) {
      // 如果墩数据异常，回退到领出逻辑（出最大的牌）
      console.warn('AI: 墩数据异常，回退到领出逻辑');
      return selectLeadCard(hand);
    }
    const leadSuit = trick.cards[0].card.suit;
    console.log(`AI: ${myPosition} 跟牌，领出花色=${leadSuit}，当前墩=${trick.cards.length}张`);
    const result = selectFollowCard(hand, trick, leadSuit, myPosition, partnerPosition);
    if (!result) {
      console.warn(`AI: ${myPosition} selectFollowCard 返回 null/undefined`);
    }
    return result;
  }
}
