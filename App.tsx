/**
 * =============================================================================
 * 迷你桥牌 (Mini-Bridge) - 应用入口组件
 * =============================================================================
 *
 * 【文件作用】
 * 这是整个 App 的入口点（根组件）。它负责：
 * 1. 管理全局游戏状态（使用 React useState）
 * 2. 切换主菜单和游戏界面
 * 3. 发牌、决定庄家、处理出牌流程
 * 4. 协调 AI 和人类玩家的行动
 *
 * 【状态管理设计（React useState）】
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                         App 组件状态                                 │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ 1. currentScreen: 'menu' | 'game'                                  │
 * │    - 当前显示哪个界面：主菜单 vs 游戏画布                            │
 * │                                                                      │
 * │ 2. gameState: GameState | null                                       │
 * │    - 完整的游戏状态（发牌后才有）                                     │
 * │    - 包含4个玩家、当前墩、赢墩数等                                    │
 * │                                                                      │
 * │ 状态流转图：                                                         │
 * │                                                                      │
 * │  ┌────────┐    点击单人训练    ┌────────────┐                       │
 * │  │  菜单   │ ────────────────→ │  发牌初始化  │                       │
 * │  │ Screen │                   │  createGame │                       │
 * │  └────────┘                   └──────┬───────┘                       │
 * │       ↑                              │                              │
 * │       │                              ↓                              │
 * │       │                        ┌──────────┐                         │
 * │       └────────────────────────│ 游戏进行  │←───────────────────┐   │
 * │           游戏结束/重置         │  Screen  │    出牌循环         │   │
 * │                                └──────────┘                     │   │
 * │                                      │                          │   │
 * │                              人类点击牌                          │   │
 * │                              或 AI自动出 ───────────────────────┘   │
 * │                                                                      │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 【为什么不用 Redux/Zustand？】
 * 这个 App 的状态完全局限在 App 组件内，通过 props 传递给子组件。
 * 使用 React 原生的 useState 足够简单清晰，不需要引入第三方状态库。
 * =============================================================================
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

// 导入类型
import {
  Suit,
  Rank,
  Position,
  Card,
  Player,
  Trick,
  GameState,
  createCard,
  calculateHandHCP,
  getSortedHand,
  getNextPosition,
  getPartner,
  isValidMove,
  determineTrickWinner,
  SUIT_ORDER,
  RANK_ORDER_DESC,
  HCP_VALUES,
} from './src';

// 导入 AI 引擎
import { makeAIDecision } from './src/utils/AIEngine';

// 导入界面组件
import MainMenuScreen from './src/screens/MainMenuScreen';
import HandReviewScreen from './src/screens/HandReviewScreen';
import GamePlayScreen from './src/screens/GamePlayScreen';

// =============================================================================
// 第一部分：辅助函数 - 游戏初始化和发牌
// =============================================================================

/**
 * 【创建一副完整的桥牌（52张）】
 *
 * 桥牌使用标准 52 张扑克牌（无大小王）。
 * 生成所有 4 种花色 × 13 个点数的组合。
 *
 * @returns 52张卡牌的数组
 */
function createFullDeck(): Card[] {
  const deck: Card[] = [];

  // 遍历所有花色
  for (const suit of SUIT_ORDER) {
    // 遍历所有点数
    for (const rank of RANK_ORDER_DESC) {
      // 创建卡牌（createCard 会自动计算 HCP）
      deck.push(createCard(suit, rank));
    }
  }

  return deck;
}

/**
 * 【洗牌函数 - Fisher-Yates 算法】
 *
 * 经典的随机洗牌算法，确保每张牌出现在每个位置的概率相等。
 *
 * 【算法原理】
 * 从数组末尾开始，随机选一个位置（包括自己和前面的），交换。
 * 逐步向前，直到数组开头。
 *
 * @param deck - 牌组
 * @returns 打乱顺序的牌组
 */
function shuffleDeck(deck: Card[]): Card[] {
  // 创建副本，不修改原数组
  const shuffled = [...deck];

  // Fisher-Yates 洗牌
  for (let i = shuffled.length - 1; i > 0; i--) {
    // 随机选一个 0 到 i 的位置
    const j = Math.floor(Math.random() * (i + 1));
    // 交换
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * 【决定庄家（Declarer）】
 *
 * 【重要：固定让 South 作为庄家】
 *
 * 为了教育意义和用户体验，人类玩家（South）固定成为庄家：
 * 1. South 是人类，让孩子作为庄家体验完整的叫牌和打牌流程
 * 2. North 成为明手（Dummy），孩子可以点击 North 的牌替明手出牌
 * 3. East 和 West 是 AI 对手
 *
 * @param _players - 4个玩家（仅用于类型兼容，实际忽略参数）
 * @returns 庄家的方位（固定为 South）
 */
function determineDeclarer(_players: Player[]): Position {
  // 固定返回 South，确保人类玩家永远是庄家
  return Position.South;
}

/**
 * 【初始化新游戏】
 *
 * 创建一副牌、洗牌、发给4个玩家、决定庄家、确定首攻。
 *
 * @param cardCount - 牌制：6张（幼儿园）、8张（小学）、13张（标准）
 * @returns 完整的初始游戏状态
 */
function createNewGame(cardCount: 6 | 8 | 13 = 13): GameState {
  // 1. 创建并洗牌
  const deck = shuffleDeck(createFullDeck());

  // 2. 发牌（根据牌制，每人发6/8/13张）
  const northHand = getSortedHand(deck.slice(0, cardCount));
  const eastHand = getSortedHand(deck.slice(cardCount, cardCount * 2));
  const southHand = getSortedHand(deck.slice(cardCount * 2, cardCount * 3));
  const westHand = getSortedHand(deck.slice(cardCount * 3, cardCount * 4));

  // 3. 创建玩家对象
  const players: Player[] = [
    { position: Position.North, hand: northHand, isHuman: false, isDeclarer: false },
    { position: Position.East, hand: eastHand, isHuman: false, isDeclarer: false },
    { position: Position.South, hand: southHand, isHuman: true, isDeclarer: false },  // South 是人类
    { position: Position.West, hand: westHand, isHuman: false, isDeclarer: false },
  ];

  // 4. 决定庄家
  const declarerPosition = determineDeclarer(players);
  const declarer = players.find(p => p.position === declarerPosition)!;
  declarer.isDeclarer = true;

  // 5. 明手是庄家的队友
  const dummyPosition = getPartner(declarerPosition);

  // 6. 首攻：庄家的下家（顺时针）出第一张牌
  const openingLeadPosition = getNextPosition(declarerPosition);

  // 7. 构建初始游戏状态
  const gameState: GameState = {
    players,
    currentTrick: {
      cards: [],
      leadSuit: null,
      winner: null,
    },
    completedTricks: [],
    nsTricks: 0,
    ewTricks: 0,
    declarer: declarerPosition,
    dummy: dummyPosition,
    currentPlayer: openingLeadPosition,
    cardCount,  // 牌制（6/8/13张）
  };

  return gameState;
}

// =============================================================================
// 第二部分：主应用组件
// =============================================================================

export default function App() {
  // ─────────────────────────────────────────────────────────────────────────
  // 状态定义（React useState）
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * currentScreen: 当前显示的界面
   * - 'menu': 主菜单
   * - 'review': 手牌确认（发牌后、出牌前）
   * - 'game': 游戏画布
   */
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'review' | 'game'>('menu');

  /**
   * gameState: 完整的游戏状态
   * null 表示还没有开始游戏（刚打开 App 或在菜单）
   */
  const [gameState, setGameState] = useState<GameState | null>(null);

  /**
   * 【刚完成的墩】
   * 用于显示第4张牌打出后的结算结果，延迟清空
   * 包含赢家信息和延迟标志
   */
  const [completedTrickDisplay, setCompletedTrickDisplay] = useState<{
    trick: Trick | null;
    winner: Position | null;
    isShowing: boolean;
  }>({ trick: null, winner: null, isShowing: false });


  /**
   * 【游戏结束结算信息】
   * 当所有牌出完后显示最终胜负结果
   */
  const [gameOverResult, setGameOverResult] = useState<{
    isShowing: boolean;
    nsTricks: number;
    ewTricks: number;
    winner: 'NS' | 'EW' | 'tie';
    message: string;
  } | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // 回调函数定义
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 【开始单人游戏】
   * 从主菜单点击"单人实战训练"后触发
   * 流程：发牌 → 显示审牌界面（review） → 等待确认
   * @param cardCount - 牌制：6张（幼儿园）、8张（小学）、13张（标准）
   */
  const handleStartSinglePlayer = useCallback((cardCount: 6 | 8 | 13 = 13) => {
    // 【关键】清除残留状态，确保新游戏开始时状态干净
    setCompletedTrickDisplay({ trick: null, winner: null, isShowing: false });
    setGameOverResult(null);

    // 创建新游戏状态，传入牌制
    const newGame = createNewGame(cardCount);
    setGameState(newGame);
    // 先进入审牌界面，让用户查看手牌和确认
    setCurrentScreen('review');
  }, []);

  /**
   * 【重置游戏】
   * 在游戏界面点击"重新发牌"后触发
   */
  const handleResetGame = useCallback(() => {
    // 【关键】重置所有游戏相关状态，防止残留状态影响新游戏
    setCompletedTrickDisplay({ trick: null, winner: null, isShowing: false });
    setGameOverResult(null);

    // 使用当前牌制或默认13张
    const currentCardCount = gameState?.cardCount ?? 13;
    const newGame = createNewGame(currentCardCount);
    setGameState(newGame);
    // 重新发牌后也先进入审牌界面
    setCurrentScreen('review');
  }, [gameState?.cardCount]);

  /**
   * 【处理出牌】
   * 当人类（或 AI 代理的明手）成功打出一张牌时触发
   *
   * 【核心流程】
   * 1. 从玩家手牌中移除打出的牌
   * 2. 将牌加入当前墩
   * 3. 判断是否墩已满（4张）
   *    - 未满：轮到下家出牌
   *    - 已满：判定赢家，计分，开始新墩
   * 4. 触发 AI 行动（如果下家是 AI）
   */
  const handlePlayCard = useCallback((position: Position, card: Card) => {
    // 追踪调用来源
    const stack = new Error().stack;
    const caller = stack?.split('\n')[2]?.trim() || 'unknown';
    console.log(`handlePlayCard 被调用: ${position} 出 ${card.suit}${card.rank}, 当前墩=${gameState?.currentTrick.cards.length || 0}张, 调用者=${caller}`);

    setGameState(prevState => {
      if (!prevState) return null;

      // 步骤1：从手牌中移除这张牌
      const updatedPlayers = prevState.players.map(player => {
        if (player.position === position) {
          return {
            ...player,
            hand: player.hand.filter(
              c => !(c.suit === card.suit && c.rank === card.rank)
            ),
          };
        }
        return player;
      });

      // 步骤2：将牌加入当前墩
      const updatedTrick: Trick = {
        ...prevState.currentTrick,
        cards: [...prevState.currentTrick.cards, { position, card }],
        leadSuit: prevState.currentTrick.leadSuit || card.suit, // 第一张决定领出花色
      };

      // 步骤3：判断是否墩已满（4张）
      if (updatedTrick.cards.length === 4) {
        // 墩已满，结算这一墩
        const winner = determineTrickWinner(updatedTrick);
        console.log(`handlePlayCard: 墩满4张，赢家=${winner}，打出第4张的是 ${position}`);

        // 更新赢墩数
        const isNSWinner = winner === Position.North || winner === Position.South;
        const newNsTricks = prevState.nsTricks + (isNSWinner ? 1 : 0);
        const newEwTricks = prevState.ewTricks + (isNSWinner ? 0 : 1);

        // 保存完成的墩到历史
        const completedTrick: Trick = {
          ...updatedTrick,
          winner,
        };

        // 【关键】设置显示状态，让玩家看到第4张牌和赢家
        setCompletedTrickDisplay({
          trick: completedTrick,
          winner,
          isShowing: true,
        });

        // 【关键】标记墩正在结算中，防止 AI 在此期间反复尝试出牌
        // 已移除 isTrickSettling 状态，改为通过检查 currentTrick.cards.length 来判断

        // 检查游戏是否结束（所有牌出完）
        const isGameOver = prevState.completedTricks.length + 1 >= prevState.cardCount;

        // 【游戏结束】设置结算信息
        if (isGameOver) {
          const finalNsTricks = newNsTricks;
          const finalEwTricks = newEwTricks;
          let gameWinner: 'NS' | 'EW' | 'tie';
          let message: string;

          if (finalNsTricks > finalEwTricks) {
            gameWinner = 'NS';
            message = `🎉 恭喜！我们获胜了！\n${finalNsTricks} : ${finalEwTricks}`;
          } else if (finalEwTricks > finalNsTricks) {
            gameWinner = 'EW';
            message = `💪 我们输了，继续加油！\n${finalNsTricks} : ${finalEwTricks}`;
          } else {
            gameWinner = 'tie';
            message = `🤝 平局！势均力敌！\n${finalNsTricks} : ${finalEwTricks}`;
          }

          // 延迟显示结算画面（等待最后一墩的2秒延迟）
          setTimeout(() => {
            setGameOverResult({
              isShowing: true,
              nsTricks: finalNsTricks,
              ewTricks: finalEwTricks,
              winner: gameWinner,
              message,
            });
            // 【关键】游戏结束时也要清除结算标记（已移除 isTrickSettling 状态）
          }, 2000);
        } else {
          // 游戏未结束：延迟2秒后清空当前墩，开始新的一墩
          console.log(`墩满: 赢家=${winner}，2秒后开始新墩`);
          setTimeout(() => {
            console.log(`墩结算完成: 设置 currentPlayer=${winner}，清空墩`);
            setGameState(prev => {
              if (!prev) return null;
              return {
                ...prev,
                currentTrick: { cards: [], leadSuit: null, winner: null },
                currentPlayer: winner, // 赢家领出下一墩
              };
            });
            // 清空显示状态
            setCompletedTrickDisplay({ trick: null, winner: null, isShowing: false });
          }, 2000); // 2秒延迟，让玩家看清结果
        }

        // 立即返回状态更新（但不改变 currentTrick 和 currentPlayer，等延迟后再改）
        // 【关键】不立即设置 currentPlayer 为赢家，避免 AI useEffect 被反复触发
        return {
          ...prevState,
          players: updatedPlayers,
          completedTricks: [...prevState.completedTricks, completedTrick],
          nsTricks: newNsTricks,
          ewTricks: newEwTricks,
          // currentTrick 保持为 updatedTrick，让第4张牌显示出来
          currentTrick: updatedTrick,
          // currentPlayer 暂时保持不变，等2秒后再设置为赢家
          currentPlayer: prevState.currentPlayer,
        };
      }

      // 墩未满，轮到下家
      const nextPlayer = getNextPosition(position);
      console.log(`handlePlayCard: ${position} 出完牌，轮到 ${nextPlayer} (墩=${updatedTrick.cards.length}张)`);

      return {
        ...prevState,
        players: updatedPlayers,
        currentTrick: updatedTrick,
        currentPlayer: nextPlayer,
      };
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // AI 自动行动效果（useEffect）
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * 【AI 自动化效果】
   *
   * 当轮到 AI 出牌时，自动调用 AI 引擎决策并出牌。
   *
   * 【重要设计：明手由人类或 AI 代理】
   * - 如果庄家是人类 → 明手由人类点击出牌（不在此 effect 处理）
   * - 如果庄家是 AI → 明手由 AI 自动出牌（在此 effect 处理）
   *
   * 【关键限制：审牌阶段不自动出牌】
   * 当 currentScreen === 'review'（审牌界面）时，阻止 AI 自动出牌。
   * 只有在用户点击"开始对战"进入 'game' 界面后，才允许 AI 行动。
   *
   * 【依赖说明】
   * 只依赖 currentPlayer（gameState.currentPlayer），不依赖整个 gameState，
   * 避免 gameState 更新导致无限循环。
   */
  useEffect(() => {
    console.log(`AI Effect 触发: currentPlayer=${gameState?.currentPlayer}, cardCount=${gameState?.currentTrick.cards.length}, screen=${currentScreen}, gameOver=${gameOverResult?.isShowing}`);

    // 关键：审牌阶段、没有游戏状态、或游戏已结束时，不执行 AI 出牌
    if (currentScreen !== 'game') {
      console.log('AI Effect: 不在游戏界面，返回');
      return;
    }
    if (!gameState) {
      console.log('AI Effect: 无游戏状态，返回');
      return;
    }
    if (gameOverResult?.isShowing) {
      console.log('AI Effect: 游戏结束画面显示中，返回');
      return;
    }

    const currentPlayer = gameState.players.find(
      p => p.position === gameState.currentPlayer
    );

    if (!currentPlayer) {
      console.log(`AI Effect: 找不到玩家 ${gameState.currentPlayer}，返回`);
      return;
    }

    // 判断当前玩家是否需要 AI 代劳
    let shouldAIPlay = false;

    if (!currentPlayer.isHuman) {
      // 情况1：当前是 AI 玩家（East 或 West）
      shouldAIPlay = true;
      console.log(`AI: ${currentPlayer.position} 是 AI，准备出牌`);
    } else if (currentPlayer.position === gameState.dummy) {
      // 【简化模式】情况2：当前是明手（North），由 AI 自动代打
      // 真实桥牌中庄家控制明手，但为简化操作，此处明手完全由 AI 控制
      shouldAIPlay = true;
      console.log(`AI: ${currentPlayer.position} 是明手，由 AI 代打`);
    } else {
      console.log(`AI: ${currentPlayer.position} 是人类玩家，跳过 (currentPlayer=${gameState.currentPlayer})`);
    }

    if (!shouldAIPlay) {
      console.log(`AI: ${currentPlayer.position} 不代打，直接返回`);
      return;
    }

    // 延迟一下，让玩家能看到 AI 在"思考"
    const timer = setTimeout(() => {
      // 使用函数式获取最新状态，避免闭包问题
      setGameState(latestGameState => {
        if (!latestGameState) return null;

        // 再次确认仍在游戏界面
        if (currentScreen !== 'game') return latestGameState;

        // 确认当前玩家仍然是同一个
        const latestCurrentPlayer = latestGameState.players.find(
          p => p.position === latestGameState.currentPlayer
        );
        if (!latestCurrentPlayer || latestCurrentPlayer.position !== currentPlayer.position) {
          console.log('AI: 当前玩家已变化，跳过出牌');
          return latestGameState;
        }

        // 【关键保护】如果墩正在结算中（有4张牌），等待结算完成
        if (latestGameState.currentTrick.cards.length >= 4) {
          console.log('AI: 墩已满，等待结算完成后再出牌');
          return latestGameState;
        }

        // 【关键保护】检查游戏是否已结束（所有墩都打完）
        if (latestGameState.completedTricks.length >= latestGameState.cardCount) {
          console.log('AI: 游戏已结束，跳过出牌');
          return latestGameState;
        }

        // 获取队友方位
        const partnerPosition = getPartner(currentPlayer.position);

        // 【诊断日志】检查手牌状态
        console.log(`AI: ${latestCurrentPlayer.position} 手牌数量=${latestCurrentPlayer.hand.length}, 当前墩牌数=${latestGameState.currentTrick.cards.length}`);

        // 调用 AI 引擎决策
        const cardToPlay = makeAIDecision(
          latestCurrentPlayer.hand,
          latestGameState.currentTrick,
          latestCurrentPlayer.position,
          partnerPosition
        );

        // 【防御性编程】如果 AI 无法决策（手牌为空），跳过
        if (!cardToPlay) {
          console.log(`AI: ${latestCurrentPlayer.position} 无法决策，手牌为空或游戏已结束`);
          return latestGameState;
        }

        console.log(`AI: ${latestCurrentPlayer.position} 决定出 ${cardToPlay.suit}${cardToPlay.rank}`);

        // 执行出牌（异步调用 handlePlayCard）
        setTimeout(() => {
          handlePlayCard(latestCurrentPlayer.position, cardToPlay);
        }, 0);

        return latestGameState;
      });
    }, 800); // 800ms 延迟，让玩家能跟上节奏

    return () => clearTimeout(timer);
    // 【关键依赖】只监听必要的状态变化，避免不必要的重新触发
  }, [currentScreen, gameState?.currentPlayer, gameOverResult?.isShowing]);

  // ─────────────────────────────────────────────────────────────────────────
  // 【兜底超时机制】
  // 当某个玩家卡住超过5秒时，自动强制出牌
  // 防止游戏因为状态不一致而永久卡住
  // ─────────────────────────────────────────────────────────────────────────
  const playerStartTimeRef = useRef<number>(0);
  const [stuckCount, setStuckCount] = useState(0); // 统计卡住次数

  // 更新玩家开始时间
  useEffect(() => {
    if (gameState?.currentPlayer) {
      playerStartTimeRef.current = Date.now();
      console.log(`【兜底】${gameState.currentPlayer} 开始计时`);
    }
  }, [gameState?.currentPlayer]);

  // 兜底超时检查
  useEffect(() => {
    if (!gameState || currentScreen !== 'game' || gameOverResult?.isShowing) return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - playerStartTimeRef.current;
      const currentPlayer = gameState.players.find(p => p.position === gameState.currentPlayer);

      // 5秒超时，且当前是 AI 或明手
      if (elapsed > 5000 && currentPlayer && (!currentPlayer.isHuman || currentPlayer.position === gameState.dummy)) {
        console.log(`【兜底超时】${gameState.currentPlayer} 卡住 ${elapsed}ms，强制执行出牌`);

        // 强制出牌：直接调用 makeAIDecision，忽略所有保护
        const partnerPosition = getPartner(currentPlayer.position);
        const cardToPlay = makeAIDecision(
          currentPlayer.hand,
          gameState.currentTrick,
          currentPlayer.position,
          partnerPosition
        );

        if (cardToPlay) {
          console.log(`【兜底】强制执行出牌: ${currentPlayer.position} 出 ${cardToPlay.suit}${cardToPlay.rank}`);
          handlePlayCard(currentPlayer.position, cardToPlay);
          setStuckCount(c => c + 1);
        } else {
          console.warn(`【兜底】无法决策，手牌为空`);
        }
      }
    }, 1000); // 每秒检查一次

    return () => clearInterval(timer);
  }, [gameState, currentScreen, gameOverResult?.isShowing, handlePlayCard]);

  // ─────────────────────────────────────────────────────────────────────────
  // 渲染部分
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* 状态栏：自动适应深色/浅色 */}
      <StatusBar style="light" />

      {/* 根据 currentScreen 渲染不同界面 */}
      {currentScreen === 'menu' ? (
        // 主菜单界面
        <MainMenuScreen onStartSinglePlayer={handleStartSinglePlayer} />
      ) : currentScreen === 'review' && gameState ? (
        // 手牌审牌界面
        <HandReviewScreen
          southPlayer={gameState.players.find(p => p.position === Position.South)!}
          declarer={gameState.declarer}
          dummy={gameState.dummy}
          openingLead={gameState.currentPlayer}
          onConfirm={() => setCurrentScreen('game')}
        />
      ) : (
        // 游戏界面（需要确保 gameState 不为 null）
        gameState && (
          <>
            <GamePlayScreen
              gameState={gameState}
              onPlayCard={handlePlayCard}
              onResetGame={handleResetGame}
              completedTrickDisplay={completedTrickDisplay}
            />
            {/* 游戏结束结算画面 */}
            {gameOverResult?.isShowing && (
              <View style={styles.gameOverOverlay}>
                <View style={styles.gameOverCard}>
                  <Text style={styles.gameOverTitle}>🎉 游戏结束</Text>
                  <Text style={styles.gameOverMessage}>{gameOverResult.message}</Text>
                  <View style={styles.scoreBoard}>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>我们 (NS)</Text>
                      <Text style={[
                        styles.scoreValue,
                        gameOverResult.winner === 'NS' && styles.winnerScore
                      ]}>{gameOverResult.nsTricks}</Text>
                    </View>
                    <Text style={styles.scoreDivider}>:</Text>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>电脑 (EW)</Text>
                      <Text style={[
                        styles.scoreValue,
                        gameOverResult.winner === 'EW' && styles.winnerScore
                      ]}>{gameOverResult.ewTricks}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.playAgainButton}
                    onPress={() => {
                      setGameOverResult(null);
                      handleResetGame();
                    }}
                  >
                    <Text style={styles.playAgainText}>重新开局</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )
      )}
    </View>
  );
}

// =============================================================================
// 样式定义
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d3328', // 深绿色背景
  },

  // 游戏结束结算画面样式
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // 深色半透明背景
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,  // 最高层级，确保覆盖所有其他元素
    elevation: 9999,  // Android 需要 elevation 来控制层级
  },

  gameOverCard: {
    backgroundColor: '#1b4d3e',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#c8b896',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },

  gameOverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffd700', // 金色
    marginBottom: 20,
  },

  gameOverMessage: {
    fontSize: 18,
    color: '#f5f5dc',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 26,
  },

  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    width: '100%',
  },

  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },

  scoreLabel: {
    fontSize: 14,
    color: '#a0c4b8',
    marginBottom: 8,
  },

  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#f5f5dc',
  },

  winnerScore: {
    color: '#ffd700', // 金色高亮赢家
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  scoreDivider: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#c8b896',
    marginHorizontal: 15,
  },

  playAgainButton: {
    backgroundColor: '#ffd700',           // 亮金色背景，更醒目
    paddingHorizontal: 50,               // 更宽
    paddingVertical: 18,                 // 更高
    borderRadius: 30,                    // 更大圆角
    borderWidth: 3,                      // 更粗边框
    borderColor: '#ffffff',              // 白色边框，对比强烈
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },

  playAgainText: {
    fontSize: 20,                        // 更大字体
    fontWeight: 'bold',
    color: '#1a1a1a',                    // 深黑色文字，在金色背景上更清晰
  },
});
