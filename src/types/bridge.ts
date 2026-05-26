/**
 * =============================================================================
 * 迷你桥牌 (Mini-Bridge) - 核心数据类型定义
 * =============================================================================
 * 
 * 【文件作用】
 * 这个文件是整个 App 的"数据字典"，定义了桥牌游戏中所有用到的数据结构。
 * 就像是给所有数据画了一张设计图纸，告诉程序：一张卡牌长什么样、
 * 一个玩家包含哪些信息、一局游戏的状态如何存储等等。
 * 
 * 【对新手的重要提示】
 * TypeScript 的 interface 和 type 就像是"模具"，它们本身不会产生实际数据，
 * 只是规定了"符合这个模具的数据必须有哪些字段、字段是什么类型"。
 * 实际的游戏数据（比如具体的一手牌）会在运行时用这些模具"铸造"出来。
 * =============================================================================
 */


// =============================================================================
// 第一部分：基础枚举定义 (Enums)
// =============================================================================
// 枚举的作用：限定某个字段只能从固定的几个选项中选择，防止拼写错误

/**
 * 【花色 (Suit)】
 * 桥牌有四种花色，分为两大类：
 * - 黑色系：黑桃(Spades) ♠、梅花(Clubs) ♣
 * - 红色系：红桃(Hearts) ♥、方块(Diamonds) ♦
 * 
 * 【重要排序规则 - 红黑交替】
 * 在桥牌理牌时，花色顺序必须严格遵守：
 * 黑桃(黑) → 红桃(红) → 梅花(黑) → 方块(红)
 * 这种红黑交替的排列方式让手牌一目了然，是桥牌的规范理牌习惯。
 */
export enum Suit {
  Spades = 'Spades',      // 黑桃 ♠ - 黑色，牌力最强（桥牌中黑桃是"大花色"）
  Hearts = 'Hearts',      // 红桃 ♥ - 红色，也是大牌力
  Clubs = 'Clubs',        // 梅花 ♣ - 黑色，"小花色"
  Diamonds = 'Diamonds',  // 方块 ♦ - 红色，"小花色"
}

/**
 * 【牌面点数 (Rank)】
 * 从 2 到 A，共 13 个等级。在桥牌中，A 最大，2 最小。
 * 注意：这里用字符串而不是数字，因为 J、Q、K、A 不是纯数字。
 */
export enum Rank {
  Two = '2',
  Three = '3',
  Four = '4',
  Five = '5',
  Six = '6',
  Seven = '7',
  Eight = '8',
  Nine = '9',
  Ten = '10',
  Jack = 'J',   // 杰克/武士
  Queen = 'Q',  // 皇后
  King = 'K',   // 国王
  Ace = 'A',    // 尖/A - 最大的牌
}

/**
 * 【方位 (Position)】
 * 桥牌桌是正方形，四个人分别坐在四个方向：
 * - North (北)：坐在桌子北边，在 App 界面中对应"上方"
 * - East (东)：坐在桌子东边，在 App 界面中对应"右侧"
 * - South (南)：坐在桌子南边，在 App 界面中对应"下方"（人类玩家默认位置）
 * - West (西)：坐在桌子西边，在 App 界面中对应"左侧"
 * 
 * 【阵营配对】
 * North + South = NS 阵营（我们）
 * East + West = EW 阵营（对手/电脑）
 */
export enum Position {
  North = 'North',
  East = 'East',
  South = 'South',
  West = 'West',
}


// =============================================================================
// 第二部分：核心数据接口 (Interfaces)
// =============================================================================
// 接口的作用：定义一个复杂对象应该包含哪些字段及其类型

/**
 * 【单张卡牌 (Card)】
 * 一张扑克牌包含三个属性：
 * - suit：什么花色（黑桃/红桃/梅花/方块）
 * - rank：什么点数（2到A）
 * - hcp：大牌点（High Card Points），桥牌中用来估算牌力的数值
 * 
 * 【关于 hcp 的说明】
 * hcp 是桥牌特有的计点方式，大牌点越高说明这张牌越强：
 * - A = 4点（最强单牌）
 * - K = 3点（第二大单牌）
 * - Q = 2点
 * - J = 1点
 * - 10及以下 = 0点（小牌没有大牌点）
 * 
 * 注意：hcp 在创建卡牌时就被计算好存入，避免每次重复计算。
 */
export interface Card {
  suit: Suit;    // 花色
  rank: Rank;    // 牌面
  hcp: number;   // 大牌点（High Card Points）
}

/**
 * 【一手牌 (Hand)】
 * 就是 13 张卡牌的数组。每个人在桥牌中发 13 张牌。
 * 使用 TypeScript 的"类型别名"(type alias)，让代码更易读。
 */
export type Hand = Card[];

/**
 * 【玩家 (Player)】
 * 一个玩家包含以下信息：
 * - position：坐在哪个方位（北/东/南/西）
 * - hand：当前持有的 13 张手牌
 * - isHuman：是否是真人玩家（true=人类，false=AI）
 * - isDeclarer：是否是庄家（庄家是决定主花色并负责完成定约的人）
 * 
 * 【关于 isDeclarer 的说明】
 * 在一局桥牌中，只有一个"庄家(Declarer)"。庄家决定了"主花色"（或无主）后，
 * 由庄家和明手（庄家的队友，牌要摊开）一起对抗两个防守方。
 */
export interface Player {
  position: Position;  // 方位
  hand: Hand;           // 手牌
  isHuman: boolean;     // 是否人类玩家
  isDeclarer: boolean;  // 是否是庄家
}

/**
 * 【一墩牌 (Trick)】
 * "墩"是桥牌的基本作战单元。四个人各出一张牌，组成一墩，
 * 根据规则确定谁赢得这一墩，赢者获得这一墩的得分。
 * 
 * 一墩牌包含：
 * - cards：当前已出的牌数组（最多4张，每张记录谁出的、出了什么）
 * - leadSuit：这一墩的"领出花色"（第一张牌的花色，其他人必须跟这个花色）
 * - winner：当前预测或确定的赢家方位（还没出完时为 null）
 */
export interface Trick {
  cards: { position: Position; card: Card }[];  // 已出的牌列表
  leadSuit: Suit | null;                        // 领出花色（首出时为 null）
  winner: Position | null;                      // 赢家（还没比出结果时为 null）
}

/**
 * 【出牌尝试结果 (PlayAttemptResult)】
 * 当玩家尝试出牌时，系统需要返回这个结果：
 * - valid：这次出牌是否合法（true=可以出，false=违规）
 * - message：如果不合法，提示信息是什么（比如"你还有黑桃，必须跟花色"）
 */
export interface PlayAttemptResult {
  valid: boolean;     // 是否合法
  message?: string;    // 违规提示信息（合法时不需要）
}

/**
 * 【游戏状态 (GameState)】
 * 这是整个游戏的"全景快照"，包含一局桥牌进行中的全部信息：
 * - players：四个玩家的完整信息（包括手牌和身份）
 * - currentTrick：当前正在进行中的这一墩（已出的牌）
 * - completedTricks：已经打完的所有墩（历史记录）
 * - nsTricks：NS阵营（North+South）已经赢得的墩数
 * - ewTricks：EW阵营（East+West）已经赢得的墩数
 * - declarer：谁是庄家（从 players 中也能查到，但单独存方便快速访问）
 * - dummy：谁是明手（庄家的队友，牌需要摊开）
 * - currentPlayer：当前轮到谁出牌
 * - cardCount：牌制（6/8/13张），用于判断游戏结束
 */
export interface GameState {
  players: Player[];            // 四个玩家
  currentTrick: Trick;          // 当前这一墩
  completedTricks: Trick[];     // 已完成的墩
  nsTricks: number;             // NS阵营赢墩数
  ewTricks: number;             // EW阵营赢墩数
  declarer: Position;           // 庄家方位
  dummy: Position;              // 明手方位（庄家的队友）
  currentPlayer: Position;      // 当前轮到谁出牌
  cardCount: 6 | 8 | 13;       // 牌制（6/8/13张）
}


// =============================================================================
// 第三部分：常量定义 (Constants)
// =============================================================================
// 这些常量让代码中的魔法数字消失，提高可读性和可维护性

/**
 * 【花色符号映射】
 * 用于在界面上显示花色（♠♥♣♦）
 */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  [Suit.Spades]: '♠',
  [Suit.Hearts]: '♥',
  [Suit.Clubs]: '♣',
  [Suit.Diamonds]: '♦',
};

/**
 * 【花色颜色映射】
 * 用于给卡牌设置颜色：黑桃和梅花是黑色，红桃和方块是红色
 */
export const SUIT_COLORS: Record<Suit, string> = {
  [Suit.Spades]: '#1a1a1a',      // 深黑
  [Suit.Hearts]: '#d32f2f',      // 鲜红
  [Suit.Clubs]: '#1a1a1a',       // 深黑
  [Suit.Diamonds]: '#d32f2f',    // 鲜红
};

/**
 * 【红黑交替理牌顺序】
 * 这是桥牌的标准理牌花色顺序：
 * 1. 黑桃（黑色）
 * 2. 红桃（红色）
 * 3. 梅花（黑色）
 * 4. 方块（红色）
 * 
 * 这个数组用于排序函数，确保手牌按这个顺序分组排列。
 */
export const SUIT_ORDER: Suit[] = [
  Suit.Spades,
  Suit.Hearts,
  Suit.Clubs,
  Suit.Diamonds,
];

/**
 * 【牌面大小顺序（降序）】
 * 用于单张卡牌比较大小：A最大，K第二大...2最小
 */
export const RANK_ORDER_DESC: Rank[] = [
  Rank.Ace,
  Rank.King,
  Rank.Queen,
  Rank.Jack,
  Rank.Ten,
  Rank.Nine,
  Rank.Eight,
  Rank.Seven,
  Rank.Six,
  Rank.Five,
  Rank.Four,
  Rank.Three,
  Rank.Two,
];

/**
 * 【牌面对应的数值（用于比较大小）】
 * A=14, K=13, Q=12, J=11, 10=10, ... 2=2
 */
export const RANK_VALUES: Record<Rank, number> = {
  [Rank.Ace]: 14,
  [Rank.King]: 13,
  [Rank.Queen]: 12,
  [Rank.Jack]: 11,
  [Rank.Ten]: 10,
  [Rank.Nine]: 9,
  [Rank.Eight]: 8,
  [Rank.Seven]: 7,
  [Rank.Six]: 6,
  [Rank.Five]: 5,
  [Rank.Four]: 4,
  [Rank.Three]: 3,
  [Rank.Two]: 2,
};

/**
 * 【大牌点 (HCP) 映射】
 * 这是桥牌国际标准的大牌点计算：
 * - A (Ace) = 4点
 * - K (King) = 3点
 * - Q (Queen) = 2点
 * - J (Jack) = 1点
 * - 其他牌 = 0点
 * 
 * 一手牌如果大牌点超过 12-13 点，通常就可以考虑参与叫牌。
 */
export const HCP_VALUES: Record<Rank, number> = {
  [Rank.Ace]: 4,
  [Rank.King]: 3,
  [Rank.Queen]: 2,
  [Rank.Jack]: 1,
  [Rank.Ten]: 0,
  [Rank.Nine]: 0,
  [Rank.Eight]: 0,
  [Rank.Seven]: 0,
  [Rank.Six]: 0,
  [Rank.Five]: 0,
  [Rank.Four]: 0,
  [Rank.Three]: 0,
  [Rank.Two]: 0,
};


// =============================================================================
// 第四部分：辅助函数（纯工具函数，不涉及业务逻辑）
// =============================================================================

/**
 * 【创建一张卡牌】
 * 工厂函数：传入花色和牌面，返回一个完整的 Card 对象（自动计算 HCP）
 * 
 * @param suit - 花色
 * @param rank - 牌面
 * @returns Card 对象
 * 
 * 【使用示例】
 * const aceOfSpades = createCard(Suit.Spades, Rank.Ace);
 * // 返回: { suit: 'Spades', rank: 'A', hcp: 4 }
 */
export function createCard(suit: Suit, rank: Rank): Card {
  return {
    suit,
    rank,
    hcp: HCP_VALUES[rank],  // 自动根据牌面查表得到大牌点
  };
}

/**
 * 【计算一手牌的总大牌点】
 * 把 13 张牌的 hcp 加起来，得到这手牌的总牌力。
 * 桥牌中一手牌 13 张，hcp 范围从 0 到 37（理论上如果一手有 4 个 A、
 * 4 个 K、4 个 Q、1 个 J，hcp = 4×4 + 4×3 + 4×2 + 1 = 16+12+8+1=37）
 * 
 * @param hand - 一手牌（13张）
 * @returns 总大牌点数
 */
export function calculateHandHCP(hand: Hand): number {
  return hand.reduce((sum, card) => sum + card.hcp, 0);
}

/**
 * 【获取方位的队友】
 * 桥牌中对门是队友：
 * - North 的队友是 South
 * - South 的队友是 North
 * - East 的队友是 West
 * - West 的队友是 East
 * 
 * @param position - 当前方位
 * @returns 队友的方位
 */
export function getPartner(position: Position): Position {
  const partners: Record<Position, Position> = {
    [Position.North]: Position.South,
    [Position.South]: Position.North,
    [Position.East]: Position.West,
    [Position.West]: Position.East,
  };
  return partners[position];
}

/**
 * 【获取下一个出牌的方位（顺时针）】
 * 出牌顺序是顺时针：North → East → South → West → North...
 * 
 * @param position - 当前方位
 * @returns 下一个出牌的方位
 */
export function getNextPosition(position: Position): Position {
  const next: Record<Position, Position> = {
    [Position.North]: Position.East,
    [Position.East]: Position.South,
    [Position.South]: Position.West,
    [Position.West]: Position.North,
  };
  return next[position];
}
