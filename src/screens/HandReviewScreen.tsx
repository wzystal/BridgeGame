/**
 * =============================================================================
 * 迷你桥牌 (Mini-Bridge) - 手牌确认界面
 * =============================================================================
 *
 * 【文件作用】
 * 发牌后、开始出牌前，给用户一个"审牌"的机会。
 * 这是桥牌的重要仪式感，让用户：
 * 1. 充分查看自己的13张手牌
 * 2. 查看系统自动计算的大牌点（HCP）
 * 3. 了解谁是庄家、谁是明手
 * 4. 点击"开始对战"确认后才进入正式出牌
 *
 * 【界面布局】
 *
 * ┌─────────────────────────────────────┐
 * │        你的手牌（South）            │
 * │      [13张牌整齐展示]               │
 * │                                     │
 * ├─────────────────────────────────────┤
 * │  大牌点: 14点  [■■■■□]              │  <- HCP显示 + 强度指示
 * │  牌力评价: 开叫牌力                  │
 * ├─────────────────────────────────────┤
 * │  庄家: North (AI)                   │  <- 对局信息
 * │  你是: 明手 → AI将代打你的手牌       │
 * │  首攻: East (AI)                    │
 * ├─────────────────────────────────────┤
 * │                                     │
 * │      [  开始对战  ]                 │  <- 大按钮确认
 * │                                     │
 * └─────────────────────────────────────┘
 *
 * 【为什么需要这个界面？】
 * 1. 教育意义：让孩子看到自己手牌的大牌点，学习评估牌力
 * 2. 节奏缓冲：发牌后先思考，再出牌，符合真实桥牌流程
 * 3. 信息透明：明确告知谁是庄家、谁是明手，避免困惑
 * =============================================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';

// 导入类型和工具
import {
  Suit,
  Position,
  Card,
  Player,
  SUIT_SYMBOLS,
  SUIT_COLORS,
  calculateHandHCP,
  getSortedHand,
  groupHandBySuit,
  SUIT_ORDER,
  HCP_VALUES,
} from '../';

// =============================================================================
// 类型定义
// =============================================================================

interface HandReviewScreenProps {
  // 当前玩家（South，人类）
  southPlayer: Player;
  // 谁是庄家
  declarer: Position;
  // 谁是明手
  dummy: Position;
  // 谁先首攻
  openingLead: Position;
  // 点击开始对战回调
  onConfirm: () => void;
}

// =============================================================================
// 辅助组件 - 卡牌展示（简化版，用于审牌界面）
// =============================================================================

interface CardViewSmallProps {
  card: Card;
}

function CardViewSmall({ card }: CardViewSmallProps) {
  return (
    <View style={styles.cardContainer}>
      <Text style={[styles.cardSuit, { color: SUIT_COLORS[card.suit] }]}>
        {SUIT_SYMBOLS[card.suit]}
      </Text>
      <Text style={[styles.cardRank, { color: SUIT_COLORS[card.suit] }]}>
        {card.rank}
      </Text>
    </View>
  );
}

// =============================================================================
// 辅助函数
// =============================================================================

/**
 * 获取 HCP 强度评价
 */
function getHCPAssessment(hcp: number): { label: string; color: string; bars: number } {
  if (hcp >= 16) {
    return { label: '强牌！建议强力开叫', color: '#ff6b6b', bars: 5 };
  } else if (hcp >= 12) {
    return { label: '开叫牌力（足够主动叫牌）', color: '#4ecdc4', bars: 4 };
  } else if (hcp >= 8) {
    return { label: '中等牌力（可以响应同伴）', color: '#45b7d1', bars: 3 };
  } else if (hcp >= 4) {
    return { label: '弱牌（谨慎参与叫牌）', color: '#96ceb4', bars: 2 };
  } else {
    return { label: '很弱的牌（主打防守）', color: '#888888', bars: 1 };
  }
}

/**
 * 获取方位中文名称
 */
function getPositionName(pos: Position): string {
  const names: Record<Position, string> = {
    [Position.North]: 'North（北）',
    [Position.South]: 'South（南/你）',
    [Position.East]: 'East（东）',
    [Position.West]: 'West（西）',
  };
  return names[pos];
}

/**
 * 判断是否是 AI
 */
function isAI(pos: Position): string {
  return pos === Position.South ? '' : ' (AI)';
}

// =============================================================================
// 主组件
// =============================================================================

export default function HandReviewScreen({
  southPlayer,
  declarer,
  dummy,
  openingLead,
  onConfirm,
}: HandReviewScreenProps) {
  // 用户输入的大牌点
  const [userHCP, setUserHCP] = useState<string>('');
  // 输入框是否聚焦
  const [isInputFocused, setIsInputFocused] = useState(false);
  // 是否已核对答案
  const [hasChecked, setHasChecked] = useState(false);
  // 用户答案是否正确
  const [isCorrect, setIsCorrect] = useState(false);
  // 正确答案（系统计算，但不直接显示）
  const correctHCP = calculateHandHCP(southPlayer.hand);
  const assessment = getHCPAssessment(correctHCP);

  // 按花色分组（用于整齐展示）
  const grouped = groupHandBySuit(southPlayer.hand);

  // 判断玩家的角色
  const isSouthDeclarer = declarer === Position.South;
  const isSouthDummy = dummy === Position.South;

  /**
   * 核对用户输入的大牌点
   */
  const handleCheck = () => {
    const userValue = parseInt(userHCP, 10);
    if (isNaN(userValue)) {
      Alert.alert('请输入数字', '请先计算你的大牌点，然后输入一个数字。');
      return;
    }

    const isAnswerCorrect = userValue === correctHCP;
    setHasChecked(true);
    setIsCorrect(isAnswerCorrect);

    // 【自动进入对战】如果答案正确，延迟1秒后自动开始
    if (isAnswerCorrect) {
      setTimeout(() => {
        onConfirm();
      }, 1000); // 1秒延迟，让用户看到"回答正确"的反馈
    }
  };

  /**
   * 计算并显示正确答案
   */
  const handleShowAnswer = () => {
    setHasChecked(true);
    setIsCorrect(false); // 标记为查看答案，不是答对
    setUserHCP(correctHCP.toString());
  };

  return (
    <View style={styles.container}>
      {/* 核对成功后：右上角显示开始对战按钮 */}
      {hasChecked && isCorrect && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={onConfirm}
          activeOpacity={0.7}
        >
          <Text style={styles.startButtonText}>开始对战 →</Text>
        </TouchableOpacity>
      )}

      {/* 可滚动的内容区 */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>

        {/* 手牌展示区 */}
        <View style={styles.handSection}>

          {/* 按花色分组展示 */}
          <View style={styles.handGrid}>
            {SUIT_ORDER.map(suit => {
              const cards = grouped[suit];
              if (cards.length === 0) return null;

              return (
                <View key={suit} style={styles.suitColumn}>
                  {/* 花色标题：黑色花色使用浅色文字以便看清 */}
                  <Text style={[styles.suitHeader, {
                    color: SUIT_COLORS[suit]  // 使用标准花色颜色：黑桃梅花黑色，红桃方块红色
                  }]}>
                    {SUIT_SYMBOLS[suit]} {cards.length}张
                  </Text>

                  {/* 该花色的牌 */}
                  <View style={styles.cardsRow}>
                    {cards.map((card, idx) => (
                      <View key={`${card.suit}-${card.rank}`} style={styles.cardWrapper}>
                        <CardViewSmall card={card} />
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* HCP 大牌点计算区 */}
        <View style={styles.hcpSection}>
          <Text style={styles.sectionTitle}>大牌点计算 (A=4 K=3 Q=2 J=1)</Text>

          {/* 用户输入区 */}
          <View style={styles.inputSection}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.hcpInput}
                value={userHCP}
                onChangeText={setUserHCP}
                keyboardType="numeric"
                placeholder={isInputFocused ? '' : '?'}
                placeholderTextColor="#666"
                maxLength={2}
                editable={!hasChecked || !isCorrect}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
              <Text style={styles.inputUnit}>点</Text>
            </View>
          </View>

          {/* 核对按钮（未核对时显示） */}
          {!hasChecked && (
            <TouchableOpacity style={styles.checkButton} onPress={handleCheck}>
              <Text style={styles.checkButtonText}>核对我的答案</Text>
            </TouchableOpacity>
          )}

          {/* 核对结果 */}
          {hasChecked && (
            <View style={styles.resultBox}>
              {isCorrect ? (
                <>
                  <Text style={styles.correctText}>回答正确！</Text>
                  <Text style={styles.resultDetail}>
                    你的大牌点是 {correctHCP} 点，{assessment.label}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.wrongText}>答案不对哦，请修改后重新核对</Text>
                  <Text style={styles.resultDetail}>
                    你输入的是 {userHCP} 点，正确答案是 {correctHCP} 点
                  </Text>
                  <TouchableOpacity style={styles.recheckButton} onPress={handleCheck}>
                    <Text style={styles.recheckButtonText}>重新核对</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.showAnswerButton} onPress={handleShowAnswer}>
                    <Text style={styles.showAnswerText}>查看正确答案</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 对局信息区 */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>对局信息</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>庄家 (Declarer):</Text>
            <Text style={styles.infoValue}>
              {getPositionName(declarer)}{isAI(declarer)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>明手 (Dummy):</Text>
            <Text style={styles.infoValue}>
              {getPositionName(dummy)}{isAI(dummy)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>首攻 (Opening Lead):</Text>
            <Text style={styles.infoValue}>
              {getPositionName(openingLead)}{isAI(openingLead)}
            </Text>
          </View>

        </View>

      </ScrollView>
    </View>
  );
}

// =============================================================================
// 样式定义
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d3328',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 内容区（标题栏已移除，最大化显示手牌和计算区）
  // ─────────────────────────────────────────────────────────────────────────
  content: {
    flex: 1,
  },

  contentInner: {
    padding: 16,
    paddingBottom: 100,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c8b896',
    marginBottom: 12,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 手牌展示区
  // ─────────────────────────────────────────────────────────────────────────
  handSection: {
    backgroundColor: '#e8e0d0',  // 浅米色背景，让黑色花色清晰可见
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c8b896',
  },

  handGrid: {
    // gap 在旧版 RN 中不支持，使用 padding/margin 替代
  },

  suitColumn: {
    marginBottom: 8,
  },

  suitHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // gap 在旧版 RN 中不支持，使用 cardWrapper 的 margin 替代
  },

  cardWrapper: {
    margin: 2,
  },

  cardContainer: {
    width: 36,
    height: 50,
    backgroundColor: '#f5f5dc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardSuit: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  cardRank: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HCP 展示区
  // ─────────────────────────────────────────────────────────────────────────
  hcpSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },

  hcpDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },

  hcpNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#f5f5dc',
  },

  hcpUnit: {
    fontSize: 20,
    color: '#a0c4b8',
    marginLeft: 4,
  },

  hcpBars: {
    flexDirection: 'row',
    marginBottom: 8,
    // gap 在旧版 RN 中不支持，使用 hcpBar 的 marginRight 替代
  },

  hcpBar: {
    width: 30,
    height: 8,
    borderRadius: 4,
    marginRight: 4,  // 替代 gap
  },

  hcpLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  hcpLegend: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  hcpLegendText: {
    fontSize: 12,
    color: '#a0c4b8',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HCP 计算交互样式
  // ─────────────────────────────────────────────────────────────────────────
  inputSection: {
    alignItems: 'center',
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 16,
    color: '#f5f5dc',
    marginBottom: 12,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  hcpInput: {
    width: 80,
    height: 50,
    backgroundColor: '#f5f5dc',
    borderRadius: 8,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },

  inputUnit: {
    fontSize: 18,
    color: '#f5f5dc',
    marginLeft: 8,
  },

  checkButton: {
    backgroundColor: '#8b6914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },

  checkButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  resultBox: {
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    width: '100%',
  },

  correctText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ecdc4',
    marginBottom: 4,
  },

  wrongText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 4,
  },

  resultDetail: {
    fontSize: 14,
    color: '#a0c4b8',
    textAlign: 'center',
  },

  // 重新核对按钮（答错时显示，让用户修改后重新核对）
  recheckButton: {
    marginTop: 12,
    backgroundColor: '#2d6a4f',  // 绿色，表示可操作的确认按钮
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  recheckButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  showAnswerButton: {
    marginTop: 12,
    backgroundColor: '#4a4a4a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },

  showAnswerText: {
    fontSize: 14,
    color: '#a0c4b8',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 对局信息区
  // ─────────────────────────────────────────────────────────────────────────
  infoSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  infoLabel: {
    fontSize: 14,
    color: '#a0c4b8',
  },

  infoValue: {
    fontSize: 14,
    color: '#f5f5dc',
    fontWeight: '500',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 右上角开始按钮（核对成功后显示）
  // ─────────────────────────────────────────────────────────────────────────
  startButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#ffd700',  // 亮金色背景，非常醒目
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',      // 白色边框
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',  // 深黑色文字，在金色背景上清晰
  },

});
