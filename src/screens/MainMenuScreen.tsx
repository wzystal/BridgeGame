/**
 * =============================================================================
 * 迷你桥牌 (Mini-Bridge) - 主菜单界面
 * =============================================================================
 * 
 * 【文件作用】
 * 这是 App 的第一个界面，用户打开 App 后看到的画面。
 * 提供两种游戏模式的入口按钮，以及整体视觉氛围的营造。
 * 
 * 【界面布局说明】
 * 使用 React Native 的 Flexbox 布局，整体结构：
 * 
 * ┌─────────────────────────────┐
 * │                             │
 * │      顶部：标题区域           │  <- "迷你桥牌"大标题 + 副标题
 * │                             │
 * ├─────────────────────────────┤
 * │                             │
 * │                             │
 * │     中间：主按钮区域          │  <- 两个大按钮（单人/双人）
 * │                             │
 * │                             │
 * ├─────────────────────────────┤
 * │      底部：版权/说明          │  <- 小字说明文字
 * │                             │
 * └─────────────────────────────┘
 * 
 * 【颜色主题】
 * - 背景：深绿色渐变（#1b4d3e → #0d3328）- 营造棋牌室的沉稳氛围
 * - 按钮1（单人）：暖木色（#8b6914）- 金色/木质感，主功能
 * - 按钮2（双人）：灰色（#666666）- 禁用状态，"即将推出"
 * - 文字：米白色（#f5f5dc）- 柔和不刺眼
 * =============================================================================
 */

import React, { useState } from 'react';
import {
  View,           // 基础容器组件，相当于网页的 div
  Text,           // 文字显示组件
  TouchableOpacity,  // 可点击的透明容器，所有按钮都用它
  StyleSheet,     // 官方推荐的样式创建方式
  Dimensions,     // 获取屏幕尺寸的工具
} from 'react-native';

// =============================================================================
// 第一部分：类型定义
// =============================================================================

/**
 * 【组件Props定义】
 * onStartSinglePlayer: 点击"单人训练"按钮时的回调函数
 *   - 由父组件（App.tsx）传入，用于切换到游戏界面
 */
interface MainMenuScreenProps {
  onStartSinglePlayer: (cardCount: 6 | 8 | 13) => void;
}

// =============================================================================
// 第二部分：组件实现
// =============================================================================

/**
 * 【主菜单组件】
 * 这是一个纯展示组件，没有自己的状态（State），只接收 props 执行回调。
 * 
 * 【React 函数组件说明】
 * - export default: 让这个组件可以被其他文件导入使用
 * - (props) => { return JSX }: 函数组件的标准写法
 * - JSX: 看起来像 HTML 的语法，实际是 JavaScript 的对象描述
 */
export default function MainMenuScreen({ onStartSinglePlayer }: MainMenuScreenProps) {
  // 牌制选择状态：默认6张（幼儿园模式）
  const [cardCount, setCardCount] = useState<6 | 8 | 13>(6);

  // ─────────────────────────────────────────────────────────────────────────
  // 渲染部分：返回 JSX 描述界面长什么样
  // ─────────────────────────────────────────────────────────────────────────

  return (
    // 最外层容器：整个屏幕的背景
    <View style={styles.container}>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 区域一：顶部标题区域 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.headerSection}>
        {/* 主标题 */}
        <Text style={styles.mainTitle}>迷你桥牌</Text>
        
        {/* 副标题/英文 */}
        <Text style={styles.subTitle}>Mini Bridge</Text>
        
        {/* 分隔装饰线 */}
        <View style={styles.divider} />
        
        {/* 功能描述 */}
        <Text style={styles.description}>儿童桥牌实战训练</Text>
      </View>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 区域二：中间按钮区域 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.buttonSection}>
        
        {/* 牌制选择区域 */}
        <View style={styles.cardCountSection}>
          <Text style={styles.cardCountLabel}>选择牌制：</Text>
          <View style={styles.cardCountButtons}>
            {[6, 8, 13].map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.cardCountButton,
                  cardCount === count && styles.cardCountButtonActive,
                ]}
                onPress={() => setCardCount(count as 6 | 8 | 13)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.cardCountButtonText,
                    cardCount === count && styles.cardCountButtonTextActive,
                  ]}
                >
                  {count}张
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.cardCountHint}>
            {cardCount === 6 ? '幼儿园模式：简单入门' :
             cardCount === 8 ? '小学模式：进阶练习' :
             '完整模式：标准桥牌'}
          </Text>
        </View>

        {/* 按钮间距 */}
        <View style={styles.buttonGap} />

        {/* 按钮1：单人实战训练（可用状态） */}
        {/*
          TouchableOpacity 是 RN 的点击组件，特点：
          - 点击时会自动有透明度变化（opacity），给用户反馈
          - 必须设置 onPress 属性来处理点击事件
          - 可以包裹任意内容（文字、图片、复杂布局）
        */}
        <TouchableOpacity
          style={styles.primaryButton}      // 样式：暖木色主按钮
          onPress={() => onStartSinglePlayer(cardCount)}  // 传递选择的牌制
          activeOpacity={0.7}                // 按下时的透明度（0-1），0.7表示变暗30%
        >
          {/* 按钮标题 */}
          <Text style={styles.primaryButtonTitle}>单人实战训练</Text>

          {/* 按钮副标题 */}
          <Text style={styles.primaryButtonSubtitle}>1 人类 + 3 AI · {cardCount}张牌</Text>
        </TouchableOpacity>

        {/* 按钮间距 */}
        <View style={styles.buttonGap} />
        
        {/* 按钮2：双人搭档作战（禁用状态） */}
        {/* 
          这个按钮是 disabled 的，使用不同的样式和禁用属性
          视觉上变灰，告诉用户这个功能暂时不可用
        */}
        <TouchableOpacity
          style={styles.disabledButton}       // 样式：灰色禁用按钮
          disabled={true}                     // 设置为禁用，点击无反应
          activeOpacity={1}                  // 禁用状态下透明度不变
        >
          {/* 按钮标题 */}
          <Text style={styles.disabledButtonTitle}>双人搭档作战</Text>
          
          {/* 按钮副标题 */}
          <Text style={styles.disabledButtonSubtitle}>同屏双人 + 2 AI</Text>
          
          {/* 即将推出标签 */}
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>即将推出</Text>
          </View>
        </TouchableOpacity>
        
      </View>
      
    </View>
  );
}

// =============================================================================
// 第三部分：样式定义
// =============================================================================

/**
 * 【StyleSheet.create 说明】
 * 这是 React Native 官方推荐的样式创建方式。好处：
 * 1. 样式对象会被验证（如果有错会报错）
 * 2. 样式会被优化处理，性能更好
 * 3. 支持类似 CSS 的写法，但使用驼峰命名（如 backgroundColor）
 * 
 * 【Flexbox 核心概念（这个界面布局的关键）】
 * - flex: 1 表示占据剩余所有空间
 * - justifyContent: 主轴方向的对齐（center居中, flex-start顶部, flex-end底部）
 * - alignItems: 交叉轴方向的对齐
 * - flexDirection: 主轴方向（column纵向, row横向）
 */
const styles = StyleSheet.create({
  
  // ─────────────────────────────────────────────────────────────────────────
  // 最外层容器：全屏背景
  // ─────────────────────────────────────────────────────────────────────────
  container: {
    flex: 1,                           // 占据整个屏幕高度
    backgroundColor: '#1b4d3e',          // 深绿色背景（棋牌室感）
    // 渐变效果说明：RN 标准不支持 CSS 渐变，这里用纯色
    // 如需渐变需要额外库，为了简单先用纯色
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // 顶部标题区域
  // ─────────────────────────────────────────────────────────────────────────
  headerSection: {
    flex: 3,                             // 占据 3/10 的垂直空间
    justifyContent: 'center',            // 内容垂直居中
    alignItems: 'center',                // 内容水平居中
    paddingTop: 60,                      // 顶部留出状态栏空间
  },
  
  // 主标题样式
  mainTitle: {
    fontSize: 48,                        // 大字号
    fontWeight: 'bold',                  // 粗体
    color: '#f5f5dc',                    // 米白色（柔和不刺眼）
    letterSpacing: 8,                    // 字间距，让标题更舒展
    textShadowColor: 'rgba(0, 0, 0, 0.3)',  // 文字阴影颜色
    textShadowOffset: { width: 2, height: 2 },  // 阴影偏移
    textShadowRadius: 4,                 // 阴影模糊半径
  },
  
  // 副标题样式
  subTitle: {
    fontSize: 18,
    color: '#c8b896',                    // 浅金色
    marginTop: 8,
    letterSpacing: 4,
  },
  
  // 分隔线
  divider: {
    width: 120,
    height: 2,
    backgroundColor: '#c8b896',
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 1,                     // 圆角
  },
  
  // 功能描述
  description: {
    fontSize: 16,
    color: '#a0c4b8',                    // 浅绿色
    letterSpacing: 2,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 牌制选择区域
  // ─────────────────────────────────────────────────────────────────────────
  cardCountSection: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 20,
  },

  cardCountLabel: {
    fontSize: 14,
    color: '#c8b896',
    marginBottom: 10,
  },

  cardCountButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },

  cardCountButton: {
    backgroundColor: 'rgba(200, 184, 150, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200, 184, 150, 0.4)',
  },

  cardCountButtonActive: {
    backgroundColor: '#8b6914',
    borderColor: '#c8b896',
  },

  cardCountButtonText: {
    fontSize: 16,
    color: '#c8b896',
    fontWeight: '500',
  },

  cardCountButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },

  cardCountHint: {
    fontSize: 12,
    color: '#a0c4b8',
    fontStyle: 'italic',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 中间按钮区域
  // ─────────────────────────────────────────────────────────────────────────
  buttonSection: {
    flex: 5,                             // 占据 5/10 的垂直空间（增大）
    justifyContent: 'flex-start',        // 从顶部开始布局，避免与标题重叠
    alignItems: 'center',                // 按钮水平居中
    paddingHorizontal: 40,               // 左右内边距
    paddingTop: 20,                      // 顶部内边距，与标题保持间距
  },
  
  // 主按钮样式（单人模式 - 可用）
  primaryButton: {
    width: '100%',                       // 宽度填满父容器
    maxWidth: 320,                       // 但最大不超过 320（大屏上不要太宽）
    backgroundColor: '#8b6914',          // 暖木色/金色
    borderRadius: 16,                    // 大圆角
    paddingVertical: 24,                 // 垂直内边距
    paddingHorizontal: 32,               // 水平内边距
    alignItems: 'center',                // 内部文字居中
    // 阴影效果（iOS）
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    // 阴影效果（Android）
    elevation: 8,                        // Android 专用阴影高度
  },
  
  // 主按钮标题
  primaryButtonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  
  // 主按钮副标题
  primaryButtonSubtitle: {
    fontSize: 14,
    color: '#d4c4a8',                    // 浅木色
    marginTop: 6,
  },
  
  // 按钮间距
  buttonGap: {
    height: 20,                          // 两个按钮之间空 20 像素
  },
  
  // 禁用按钮样式（双人模式 - 不可用）
  disabledButton: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#4a4a4a',          // 深灰色
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    opacity: 0.7,                        // 整体透明度降低，视觉上变灰
  },
  
  // 禁用按钮标题
  disabledButtonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#888888',                    // 灰色文字
    letterSpacing: 2,
  },
  
  // 禁用按钮副标题
  disabledButtonSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 6,
  },
  
  // "即将推出"标签容器
  comingSoonBadge: {
    marginTop: 10,
    backgroundColor: '#333333',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  
  // "即将推出"文字
  comingSoonText: {
    fontSize: 12,
    color: '#aaaaaa',
  },
  
});
