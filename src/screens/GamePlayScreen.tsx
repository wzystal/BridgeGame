/**
 * =============================================================================
 * 迷你桥牌 (Mini-Bridge) - 游戏主画布界面
 * =============================================================================
 * 
 * 【文件作用】
 * 这是游戏进行中的主界面，展示十字牌桌、所有玩家的手牌状态、
 * 当前墩的进行情况、赢墩数统计等。这是整个 App 最核心的界面。
 * 
 * 【界面布局说明 - 十字牌桌】
 * 使用 Flexbox 实现自适应的十字形布局：
 * 
 * ┌─────────────────────────────────────┐
 * │                                   │
 * │           North (明手)             │  <- 顶部：明手的牌摊开
 * │           ♠♥♣♦ 四列               │
 * │                                   │
 * ├─────────┬─────────────────┬─────────┤
 * │         │                 │         │
 * │  West   │    当前墩展示    │  East   │  <- 中间行
 * │  (AI左)  │   [♠A][♥K][?]   │  (AI右)  │
 * │         │                 │         │
 * ├─────────┴─────────────────┴─────────┤
 * │                                   │
 * │           South (人类)             │  <- 底部：人类的手牌
 * │         [可点击的牌]               │     横向排列，可点击
 * │                                   │
 * └─────────────────────────────────────┘
 * 
 * 【核心状态流转（React useState 设计）】
 * 
 * 1. gameState: GameState - 完整的游戏状态（从父组件传入）
 * 2. selectedCard: Card | null - 人类当前选中的卡牌（待确认出牌）
 * 3. invalidPlayMessage: string | null - 违规出牌时的提示信息
 * 4. trickWinner: Position | null - 当前墩的赢家（墩结束时显示）
 * 
 * 【明手（Dummy）展示规则】
 * - 定约确定后，庄家的队友成为明手
 * - 明手的牌必须按花色分成4列，全部摊开可见
 * - 操作权限：
 *   * 人类是庄家 → 点击明手牌替明手出
 *   * AI是庄家 → AI自动操作明手牌
 * 
 * 【出牌交互流程】
 * 1. 人类看到自己手牌（或明手牌）全部亮着
 * 2. 点击一张牌 → 系统调用 isValidMove 校验
 * 3. 如果合法 → 触发 onPlayCard 回调，更新游戏状态
 * 4. 如果违规 → 显示提示信息，牌不打出
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';

// 导入所有类型和工具函数
import {
  // 类型
  Suit,
  Rank,
  Position,
  Card,
  Hand,
  Player,
  Trick,
  GameState,
  PlayAttemptResult,
  // 常量
  SUIT_SYMBOLS,
  SUIT_COLORS,
  SUIT_ORDER,
  // 工具函数
  getSortedHand,
  groupHandBySuit,
  isValidMove,
  hasSuit,
  getNextPosition,
  getPartner,
  determineTrickWinner,
  RANK_VALUES,
} from '../';

// =============================================================================
// 第一部分：类型定义
// =============================================================================

/**
 * 【组件Props定义】
 * gameState: 完整的游戏状态（由 App 组件管理，通过 props 传入）
 * onPlayCard: 当人类成功打出一张牌时的回调（通知父组件更新状态）
 * onResetGame: 重新发牌/重置游戏的回调
 */
interface GamePlayScreenProps {
  gameState: GameState;
  onPlayCard: (position: Position, card: Card) => void;
  onResetGame: () => void;
  // 刚完成的墩信息（用于显示结算结果）
  completedTrickDisplay?: {
    trick: Trick | null;
    winner: Position | null;
    isShowing: boolean;
  };
}

// =============================================================================
// 第二部分：辅助组件 - 卡牌展示组件
// =============================================================================

/**
 * 【卡牌展示组件】
 * 这个组件负责渲染单张卡牌的外观。
 * 
 * 【设计说明】
 * - 由于图片资源暂未准备，使用纯色背景 + 花色符号 + 牌面文字
 * - 预留了 imageSource 属性，未来可以直接替换为图片
 * - 可点击状态通过边框和透明度变化体现
 * 
 * @param card - 要展示的卡牌
 * @param onPress - 点击回调（可选，如果卡牌可点击）
 * @param disabled - 是否禁用点击
 * @param size - 卡牌尺寸（'small'|'medium'|'large'）
 */
interface CardViewProps {
  card: Card;
  onPress?: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

function CardView({ card, onPress, disabled = false, size = 'medium' }: CardViewProps) {
  // 根据尺寸确定样式
  const sizeStyles = {
    small: { width: 36, height: 50, fontSize: 12 },
    medium: { width: 44, height: 62, fontSize: 16 },
    large: { width: 52, height: 74, fontSize: 20 },
  }[size];
  
  // 卡牌内容
  const cardContent = (
    <View style={[
      styles.cardContainer,
      {
        width: sizeStyles.width,
        height: sizeStyles.height,
        borderColor: disabled ? '#888' : '#fff',
        opacity: disabled ? 0.5 : 1,
      }
    ]}>
      {/* 左上角：花色符号 */}
      <Text style={[
        styles.cardSuit,
        { color: SUIT_COLORS[card.suit], fontSize: sizeStyles.fontSize }
      ]}>
        {SUIT_SYMBOLS[card.suit]}
      </Text>
      
      {/* 中间：牌面 */}
      <Text style={[
        styles.cardRank,
        { color: SUIT_COLORS[card.suit], fontSize: sizeStyles.fontSize }
      ]}>
        {card.rank}
      </Text>
    </View>
  );
  
  // 如果提供了 onPress，包装成可点击组件
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        activeOpacity={disabled ? 1 : 0.7}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }
  
  return cardContent;
}

// =============================================================================
// 第三部分：辅助组件 - 明手牌展示组件
// =============================================================================

/**
 * 【明手牌展示组件】
 * 明手的牌必须按花色分组，分成四列摊开展示。
 * 
 * 【布局】
 * 四列水平排列，每列是一个花色：
 * [♠列] [♥列] [♣列] [♦列]
 * 
 * 每列内部：牌从上到下按降序排列（A在上，2在下）
 * 
 * @param hand - 明手的手牌（13张）
 * @param onCardPress - 点击某张牌的回调（用于替明手出牌）
 * @param disabled - 是否禁用点击（不该明手出牌时）
 */
interface DummyHandViewProps {
  hand: Hand;
  onCardPress?: (card: Card) => void;
  disabled?: boolean;
}

function DummyHandView({ hand, onCardPress, disabled = false }: DummyHandViewProps) {
  // 按花色分组
  const grouped = groupHandBySuit(hand);
  
  return (
    <View style={styles.dummyContainer}>
      {SUIT_ORDER.map(suit => (
        // 每个花色一列
        <View key={suit} style={styles.dummyColumn}>
          {/* 花色标题 */}
          <Text style={[
            styles.dummySuitHeader,
            { color: SUIT_COLORS[suit] }
          ]}>
            {SUIT_SYMBOLS[suit]}
          </Text>
          
          {/* 该花色的所有牌 */}
          <View style={styles.dummyCardsColumn}>
            {grouped[suit].map((card, index) => (
              <View key={`${card.suit}-${card.rank}`} style={styles.dummyCardWrapper}>
                <CardView
                  card={card}
                  onPress={onCardPress ? () => onCardPress(card) : undefined}
                  disabled={disabled}
                  size="small"
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// =============================================================================
// 第四部分：辅助组件 - 当前墩展示组件
// =============================================================================

/**
 * 【当前墩展示组件】
 * 展示当前这一墩已经打出的牌，按方位排列在桌布中央。
 * 
 * 【布局】
 *       [North]
 * [West]       [East]
 *       [South]
 * 
 * 如果某个方位还没出牌，显示占位符。
 */
interface CurrentTrickViewProps {
  trick: Trick;
  leadPosition: Position | null;  // 领出者位置
  winner: Position | null;       // 赢家位置
  isShowingWinner: boolean;     // 是否显示赢家
}

function CurrentTrickView({ trick, leadPosition, winner, isShowingWinner }: CurrentTrickViewProps) {
  // 获取每个方位已出的牌（如果有）
  const getCardAtPosition = (position: Position): Card | null => {
    const play = trick.cards.find(c => c.position === position);
    return play ? play.card : null;
  };

  const northCard = getCardAtPosition(Position.North);
  const eastCard = getCardAtPosition(Position.East);
  const southCard = getCardAtPosition(Position.South);
  const westCard = getCardAtPosition(Position.West);

  return (
    <View style={styles.trickTable}>
      {/* 外围提示：North */}
      {leadPosition === Position.North && (
        <View style={[styles.outerBadge, styles.outerBadgeNorth, styles.outerBadgeLead]}>
          <Text style={styles.outerBadgeText}>领出</Text>
        </View>
      )}
      {isShowingWinner && winner === Position.North && (
        <View style={[styles.outerBadge, styles.outerBadgeNorth, styles.outerBadgeWinner]}>
          <Text style={styles.outerBadgeText}>赢家</Text>
        </View>
      )}

      {/* 外围提示：South */}
      {leadPosition === Position.South && (
        <View style={[styles.outerBadge, styles.outerBadgeSouth, styles.outerBadgeLead]}>
          <Text style={styles.outerBadgeText}>领出</Text>
        </View>
      )}
      {isShowingWinner && winner === Position.South && (
        <View style={[styles.outerBadge, styles.outerBadgeSouth, styles.outerBadgeWinner]}>
          <Text style={styles.outerBadgeText}>赢家</Text>
        </View>
      )}

      {/* 外围提示：West */}
      {leadPosition === Position.West && (
        <View style={[styles.outerBadge, styles.outerBadgeWest, styles.outerBadgeLead]}>
          <Text style={styles.outerBadgeText}>领出</Text>
        </View>
      )}
      {isShowingWinner && winner === Position.West && (
        <View style={[styles.outerBadge, styles.outerBadgeWest, styles.outerBadgeWinner]}>
          <Text style={styles.outerBadgeText}>赢家</Text>
        </View>
      )}

      {/* 外围提示：East */}
      {leadPosition === Position.East && (
        <View style={[styles.outerBadge, styles.outerBadgeEast, styles.outerBadgeLead]}>
          <Text style={styles.outerBadgeText}>领出</Text>
        </View>
      )}
      {isShowingWinner && winner === Position.East && (
        <View style={[styles.outerBadge, styles.outerBadgeEast, styles.outerBadgeWinner]}>
          <Text style={styles.outerBadgeText}>赢家</Text>
        </View>
      )}

      {/* 桌布背景 */}
      <View style={styles.tableSurface}>
        {/* North */}
        <View style={styles.trickPositionNorth}>
          {northCard ? (
            <CardView card={northCard} size="medium" />
          ) : (
            <View style={styles.emptyCardSlot} />
          )}
        </View>

        {/* 中间行：West - 桌面 - East */}
        <View style={styles.trickMiddleRow}>
          {/* West */}
          <View style={styles.trickPositionWest}>
            {westCard ? (
              <CardView card={westCard} size="medium" />
            ) : (
              <View style={styles.emptyCardSlot} />
            )}
          </View>

          {/* 中央：简洁的墩状态 */}
          <View style={styles.tableCenter}>
            <Text style={styles.tableCenterText}>
              {trick.cards.length}/4
            </Text>
          </View>

          {/* East */}
          <View style={styles.trickPositionEast}>
            {eastCard ? (
              <CardView card={eastCard} size="medium" />
            ) : (
              <View style={styles.emptyCardSlot} />
            )}
          </View>
        </View>

        {/* South */}
        <View style={styles.trickPositionSouth}>
          {southCard ? (
            <CardView card={southCard} size="medium" />
          ) : (
            <View style={styles.emptyCardSlot} />
          )}
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// 第五部分：主组件 - GamePlayScreen
// =============================================================================

export default function GamePlayScreen({
  gameState,
  onPlayCard,
  onResetGame,
  completedTrickDisplay,
}: GamePlayScreenProps) {
  
  // ─────────────────────────────────────────────────────────────────────────
  // 组件内部状态（useState）
  // ─────────────────────────────────────────────────────────────────────────
  
  // 违规提示信息（当有违规操作时显示）
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);
  
  // 自动隐藏违规提示的定时器
  useEffect(() => {
    if (invalidMessage) {
      const timer = setTimeout(() => {
        setInvalidMessage(null);
      }, 3000);  // 3秒后自动消失
      return () => clearTimeout(timer);
    }
  }, [invalidMessage]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // 辅助函数：处理人类玩家出牌
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * 处理人类点击卡牌尝试出牌
   * 
   * 流程：
   * 1. 判断当前是否轮到这个方位的玩家出牌
   * 2. 调用 isValidMove 检查出牌是否合法
   * 3. 合法 → 调用 onPlayCard 回调
   * 4. 违规 → 显示提示信息
   */
  const handleCardPlay = useCallback((position: Position, card: Card) => {
    // 检查是否轮到这个玩家
    if (gameState.currentPlayer !== position) {
      setInvalidMessage('还没轮到你出牌！');
      return;
    }
    
    // 获取该玩家的当前手牌
    const player = gameState.players.find(p => p.position === position);
    if (!player) return;
    
    // 检查出牌合法性
    const result = isValidMove(card, player.hand, gameState.currentTrick.leadSuit);
    
    if (result.valid) {
      // ✅ 合法出牌
      setInvalidMessage(null);
      onPlayCard(position, card);
    } else {
      // ❌ 违规出牌
      setInvalidMessage(result.message || '出牌不合法！');
    }
  }, [gameState, onPlayCard]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // 获取各个玩家的信息
  // ─────────────────────────────────────────────────────────────────────────
  const northPlayer = gameState.players.find(p => p.position === Position.North)!;
  const southPlayer = gameState.players.find(p => p.position === Position.South)!;
  const eastPlayer = gameState.players.find(p => p.position === Position.East)!;
  const westPlayer = gameState.players.find(p => p.position === Position.West)!;
  
  // 判断谁是明手（Dummy）
  const dummyPosition = gameState.dummy;
  const isNorthDummy = dummyPosition === Position.North;
  const isSouthDummy = dummyPosition === Position.South;
  
  // 判断当前该谁出牌
  const currentPlayer = gameState.currentPlayer;

  // 判断谁是领出者（第一张牌的位置）
  const leadPosition = gameState.currentTrick.cards.length > 0
    ? gameState.currentTrick.cards[0].position
    : null;

  // 判断赢家（墩结算时）
  const winner = completedTrickDisplay?.winner ?? null;
  const isShowingWinner = completedTrickDisplay?.isShowing ?? false;

  // ─────────────────────────────────────────────────────────────────────────
  // 渲染开始
  // ─────────────────────────────────────────────────────────────────────────
  
  return (
    <View style={styles.container}>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 顶部：记分板 + North 区域 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.topSection}>
        {/* 记分板 */}
        <View style={styles.scoreBoard}>
          <Text style={styles.scoreTitle}>赢墩数</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>我们 (NS):</Text>
            <Text style={styles.scoreValue}>{gameState.nsTricks}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>电脑 (EW):</Text>
            <Text style={styles.scoreValue}>{gameState.ewTricks}</Text>
          </View>
        </View>
        
        {/* North 区域 */}
        <View style={styles.northSection}>
          <Text style={styles.positionLabel}>
            North {isNorthDummy ? '(明手)' : '(AI)'}
          </Text>

          {isNorthDummy ? (
            // North 是明手：牌摊开展示，但由 AI 自动控制（简化模式）
            // 【简化模式说明】真实桥牌中庄家控制明手出牌，
            // 但为简化操作，此处明手由 AI 自动代劳，人类无需点击
            <DummyHandView
              hand={northPlayer.hand}
              onCardPress={undefined}  // 简化模式：人类不控制明手
              disabled={true}  // 始终禁用点击
            />
          ) : (
            // North 不是明手：牌背向（不展示）
            <Text style={styles.cardBackIndicator}>牌背 {northPlayer.hand.length}张</Text>
          )}
        </View>
      </View>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 中间：West - 桌中央 - East */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.middleSection}>
        {/* West 区域 */}
        <View style={styles.westSection}>
          <Text style={styles.positionLabel}>West (AI)</Text>
          <Text style={styles.cardBackIndicator}>牌背 {westPlayer.hand.length}张</Text>
        </View>
        
        {/* 中央：当前墩展示 */}
        <CurrentTrickView
          trick={gameState.currentTrick}
          leadPosition={leadPosition}
          winner={winner}
          isShowingWinner={!!isShowingWinner}
        />
        
        {/* East 区域 */}
        <View style={styles.eastSection}>
          <Text style={styles.positionLabel}>East (AI)</Text>
          <Text style={styles.cardBackIndicator}>牌背 {eastPlayer.hand.length}张</Text>
        </View>
      </View>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 底部：South 区域（人类玩家） */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.bottomSection}>
        <Text style={styles.positionLabel}>
          South {isSouthDummy ? '(明手 - AI代打)' : '(你)'}
          {currentPlayer === Position.South && ' ← 轮到你'}
        </Text>

        {isSouthDummy ? (
          // South 是明手：牌摊开，但由 AI 操作
          <DummyHandView
            hand={southPlayer.hand}
            disabled={true}  // 人类不能点击，AI 自动出
          />
        ) : (
          // South 不是明手：人类正常出牌
          <View style={styles.humanHandContainer}>
            {getSortedHand(southPlayer.hand).map((card, index) => (
              <View key={`${card.suit}-${card.rank}-${index}`} style={styles.humanCardWrapper}>
                <CardView
                  card={card}
                  onPress={() => handleCardPlay(Position.South, card)}
                  disabled={currentPlayer !== Position.South}
                  size="large"
                />
              </View>
            ))}
          </View>
        )}

        {/* 重新开局按钮（卡死时可点击） */}
        <TouchableOpacity
          style={styles.restartButton}
          onPress={onResetGame}
          activeOpacity={0.7}
        >
          <Text style={styles.restartButtonText}>重新开局</Text>
        </TouchableOpacity>
      </View>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 违规提示弹层 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {invalidMessage && (
        <View style={styles.invalidAlertOverlay}>
          <View style={styles.invalidAlertBox}>
            <Text style={styles.invalidAlertText}>⚠️ {invalidMessage}</Text>
          </View>
        </View>
      )}
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 左上角：重新发牌按钮（低调位置，避免误触） */}
    </View>
  );
}

// =============================================================================
// 第六部分：样式定义
// =============================================================================

const styles = StyleSheet.create({
  // ─────────────────────────────────────────────────────────────────────────
  // 整体容器
  // ─────────────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#0d3328',  // 深绿色桌布背景
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // 顶部区域
  // ─────────────────────────────────────────────────────────────────────────
  topSection: {
    flex: 3,
    flexDirection: 'row',  // 水平排列：记分板 | North区域
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  
  // 记分板
  scoreBoard: {
    width: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginRight: 10,
  },
  
  scoreTitle: {
    color: '#c8b896',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  
  scoreLabel: {
    color: '#a0c4b8',
    fontSize: 11,
  },
  
  scoreValue: {
    color: '#f5f5dc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // North 区域
  northSection: {
    flex: 1,
    alignItems: 'center',
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // 中间区域
  // ─────────────────────────────────────────────────────────────────────────
  middleSection: {
    flex: 4,
    flexDirection: 'row',  // 水平排列：West | 中央 | East
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  
  // West / East 区域
  westSection: {
    width: 60,
    alignItems: 'center',
  },
  
  eastSection: {
    width: 60,
    alignItems: 'center',
  },
  
  // 方位标签
  positionLabel: {
    color: '#c8b896',
    fontSize: 12,
    marginBottom: 4,
  },

  // 玩家标签行（用于放置领出/赢家徽章）
  playerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,  // 标签和徽章之间的间距
  },

  // 领出徽章
  badgeLead: {
    backgroundColor: '#ffd700',  // 金色
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#b8860b',
  },

  // 赢家徽章
  badgeWinner: {
    backgroundColor: '#ff6b6b',  // 红色
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cc5555',
  },

  // 徽章文字
  badgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // 牌背指示（AI 的牌不展示正面）
  cardBackIndicator: {
    color: '#f5f5dc',           // 米白色文字，更醒目
    fontSize: 16,               // 增大字体
    fontWeight: 'bold',         // 粗体
    backgroundColor: 'rgba(0, 0, 0, 0.6)',  // 深色背景框
    paddingHorizontal: 12,      // 左右内边距
    paddingVertical: 8,         // 上下内边距
    borderRadius: 8,            // 圆角
    borderWidth: 1,             // 边框
    borderColor: 'rgba(255, 255, 255, 0.3)', // 半透明白边框
    textAlign: 'center',
    overflow: 'hidden',
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // 当前墩展示（桌中央）
  // ─────────────────────────────────────────────────────────────────────────
  trickTable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  tableSurface: {
    width: 220,
    height: 220,
    backgroundColor: '#1b4d3e',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#c8b896',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // 牌桌外围提示徽章（绝对定位在牌桌外围）
  outerBadge: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    zIndex: 50,
  },

  outerBadgeNorth: {
    top: -28,
    alignSelf: 'center',
  },

  outerBadgeSouth: {
    bottom: -28,
    alignSelf: 'center',
  },

  outerBadgeWest: {
    left: -8,
    top: '50%',
    marginTop: -12,
  },

  outerBadgeEast: {
    right: -8,
    top: '50%',
    marginTop: -12,
  },

  outerBadgeLead: {
    backgroundColor: '#ffd700',
    borderColor: '#b8860b',
  },

  outerBadgeWinner: {
    backgroundColor: '#ff6b6b',
    borderColor: '#cc5555',
  },

  outerBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
  },
  
  trickMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  
  trickPositionNorth: {
    position: 'absolute',
    top: 10,
    alignItems: 'center',
  },
  
  trickPositionSouth: {
    position: 'absolute',
    bottom: 10,
    alignItems: 'center',
  },
  
  trickPositionWest: {
    alignItems: 'center',
  },
  
  trickPositionEast: {
    alignItems: 'center',
  },
  
  tableCenter: {
    alignItems: 'center',
  },
  
  tableCenterText: {
    color: '#6b9a86',
    fontSize: 12,
  },

  // 赢家显示样式
  winnerLabel: {
    color: '#ffd700',  // 金色
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },

  winnerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  emptyCardSlot: {
    width: 44,
    height: 62,
    borderWidth: 1,
    borderColor: '#4a4a4a',
    borderStyle: 'dashed',
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  
  leadIndicator: {
    color: '#ffd700',
    fontSize: 10,
    marginTop: 2,
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // 底部区域（人类玩家）
  // ─────────────────────────────────────────────────────────────────────────
  bottomSection: {
    flex: 3,
    alignItems: 'center',
    paddingBottom: 20,
  },
  
  // 人类手牌容器
  humanHandContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',  // 如果屏幕太窄，允许换行
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  
  humanCardWrapper: {
    margin: 3,
  },

  // 重新开局按钮（放在底部，卡死时可点击重开）
  restartButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(100, 100, 100, 0.4)',  // 半透明灰色，低调但不隐蔽
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  restartButtonText: {
    fontSize: 12,
    color: '#d0d0d0',
    fontWeight: '500',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 卡牌组件样式
  // ─────────────────────────────────────────────────────────────────────────
  cardContainer: {
    backgroundColor: '#f5f5dc',  // 米白色牌面
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // 阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  
  cardSuit: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontWeight: 'bold',
  },
  
  cardRank: {
    fontWeight: 'bold',
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // 明手牌展示样式
  // ─────────────────────────────────────────────────────────────────────────
  dummyContainer: {
    flexDirection: 'row',  // 四列水平排列
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 6,
  },
  
  dummyColumn: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  
  dummySuitHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  
  dummyCardsColumn: {
    alignItems: 'center',
  },
  
  dummyCardWrapper: {
    marginVertical: -15,  // 负边距让卡牌重叠，节省空间
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // 违规提示样式（移到屏幕顶部，避免被牌桌覆盖）
  // ─────────────────────────────────────────────────────────────────────────
  invalidAlertOverlay: {
    position: 'absolute',
    top: 80,  // 顶部位置，远离牌桌中央
    left: 0,
    right: 0,
    justifyContent: 'flex-start',  // 从顶部开始
    alignItems: 'center',
    zIndex: 999,  // 最高层级
    elevation: 999,
    pointerEvents: 'none',  // 让点击穿透到底层
  },

  invalidAlertBox: {
    backgroundColor: '#8b0000',  // 深红色警告
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: '90%',
    borderWidth: 2,
    borderColor: '#ff6b6b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },

  invalidAlertText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
});
