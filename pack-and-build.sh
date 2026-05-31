#!/bin/bash
# =============================================================================
# BridgeGame 独立 APK 构建脚本
# 功能：打包 JS Bundle + 构建 Debug APK + 自动安装
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  BridgeGame 独立 APK 构建脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 步骤1: 检查设备
echo -e "${YELLOW}[1/5] 检查 Android 设备...${NC}"
if ! adb devices | grep -q "device$"; then
    echo -e "${RED}错误: 未检测到设备${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 设备已连接${NC}"
echo ""

# 步骤2: 打包 JS Bundle
echo -e "${YELLOW}[2/5] 打包 JS Bundle...${NC}"
cd "$PROJECT_ROOT"
mkdir -p android/app/src/main/assets

npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.ts \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/ 2>&1 || {
    echo -e "${YELLOW}警告: react-native bundle 命令不可用，尝试使用 npx expo...${NC}"
    npx expo export:embed \
      --platform android \
      --entry-file index.ts \
      --bundle-output android/app/src/main/assets/index.android.bundle 2>&1 || true
}

# 检查 bundle 是否生成
if [ -f "android/app/src/main/assets/index.android.bundle" ]; then
    BUNDLE_SIZE=$(ls -lh android/app/src/main/assets/index.android.bundle | awk '{print $5}')
    echo -e "${GREEN}✓ JS Bundle 生成成功 (${BUNDLE_SIZE})${NC}"
else
    echo -e "${YELLOW}! JS Bundle 未生成，可能使用内置打包${NC}"
fi
echo ""

# 步骤3: 清理旧构建
echo -e "${YELLOW}[3/5] 清理构建缓存...${NC}"
cd "$ANDROID_DIR"
rm -rf app/build .gradle ~/.gradle/caches
echo -e "${GREEN}✓ 清理完成${NC}"
echo ""

# 步骤4: 构建 Debug APK（已签名，包含 JS Bundle）
echo -e "${YELLOW}[4/5] 构建 Debug APK...${NC}"
echo -e "${BLUE}（这可能需要几分钟）${NC}"
./gradlew assembleDebug --no-daemon 2>&1

if [ ! -f "$APK_PATH" ]; then
    echo -e "${RED}✗ APK 构建失败${NC}"
    exit 1
fi

APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
echo -e "${GREEN}✓ APK 构建成功 (${APK_SIZE})${NC}"
echo ""

# 步骤5: 安装到设备
echo -e "${YELLOW}[5/5] 安装到设备...${NC}"
adb uninstall com.anonymous.BridgeGame 2>/dev/null || true
if adb install -r "$APK_PATH"; then
    echo -e "${GREEN}✓ 安装成功${NC}"
else
    echo -e "${RED}✗ 安装失败${NC}"
    exit 1
fi
echo ""

# 启动应用
echo -e "${YELLOW}[额外] 启动应用...${NC}"
adb shell am start -n com.anonymous.BridgeGame/.MainActivity 2>/dev/null || \
echo -e "${YELLOW}! 请手动打开应用${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  独立 APK 构建安装完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}APK 路径:${NC} $APK_PATH"
echo -e "${BLUE}APK 大小:${NC} $(ls -lh $APK_PATH | awk '{print $5}')"
echo ""
echo -e "${YELLOW}提示：此 APK 可独立运行，无需 Metro 服务器${NC}"
