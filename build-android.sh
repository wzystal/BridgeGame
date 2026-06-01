#!/bin/bash
set -e

cd /Users/zhaoyang.wzy/work/BridgeGame

echo "🔧 设置环境..."
ulimit -n 4096
export METRO_NO_WATCH=true
export CI=true

echo "📝 创建 Metro 配置..."
if [ ! -f "metro.config.js" ]; then
    echo 'const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
module.exports = config;' > metro.config.js
    echo "✅ Metro 配置已创建"
fi

echo "🔨 生成原生 Android 项目..."
if [ ! -d "android" ]; then
    npx expo prebuild --platform android << 'PREBUILT'
y
PREBUILT
fi
echo "✅ 原生项目就绪"

echo "📦 生成 JS Bundle..."
mkdir -p android/app/src/main/assets

# 清理旧 bundle
rm -f android/app/src/main/assets/index.android.bundle
rm -rf android/app/src/main/res/drawable-*
rm -rf android/app/src/main/res/raw

# 打包 JS
echo "⏳ 打包 JS..."
if ! npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file node_modules/expo/AppEntry.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/ \
  --reset-cache; then
    echo "❌ JS Bundle 生成失败"
    echo "💡 尝试备用方案..."
    npx expo export:embed \
      --platform android \
      --entry-file index.ts \
      --bundle-output android/app/src/main/assets/index.android.bundle \
      --assets-dest android/app/src/main/res/
fi

if [ ! -f "android/app/src/main/assets/index.android.bundle" ]; then
    echo "❌ JS Bundle 文件未找到"
    exit 1
fi

BUNDLE_SIZE=$(ls -lh android/app/src/main/assets/index.android.bundle | awk '{ print $5 }')
echo "✅ JS Bundle: ${BUNDLE_SIZE}"

echo ""
echo "🔨 构建 APK..."
cd android
./gradlew clean
./gradlew assembleDebug

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    echo ""
    echo "✅ APK 构建成功！"
    ls -lh "$APK_PATH"
    cp "$APK_PATH" ../bridgegame-debug.apk
    echo "📦 已复制: bridgegame-debug.apk"
else
    echo "❌ 构建失败"
    exit 1
fi
