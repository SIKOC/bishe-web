@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 🚁 医疗无人机实时监控一键部署脚本 (Windows版本)
:: 使用方法: 双击运行此文件

echo ========================================
echo 🚀 开始部署实时监控功能...
echo ========================================
echo.

:: 检查是否在项目根目录
if not exist "package.json" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    pause
    exit /b 1
)

echo ✅ 检测到项目目录
echo.

:: 步骤 1: 安装依赖
echo ========================================
echo 📦 步骤 1/5: 安装依赖...
echo ========================================
call npm install @amap/amap-jsapi-loader --save
call npm install @element-plus/icons-vue --save

echo.
echo ✅ 依赖安装完成
echo.

:: 步骤 2: 配置环境变量
echo ========================================
echo ⚙️  步骤 2/5: 配置环境变量...
echo ========================================

:: 检查配置文件是否存在
if not exist ".env.development" (
    echo. > .env.development
)

:: 检查是否已配置
findstr /C:"VITE_AMAP_KEY" .env.development >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  .env.development 已存在配置，跳过
) else (
    echo. >> .env.development
    echo # 高德地图配置 >> .env.development
    echo VITE_AMAP_KEY=YOUR_AMAP_KEY_HERE >> .env.development
    echo VITE_WS_URL=ws://localhost:10010/ws/drone-tracking >> .env.development
    echo ✅ 环境变量配置完成
    echo ⚠️  请手动编辑 .env.development 填入你的高德地图Key
)

echo.

:: 步骤 3: 备份原文件
echo ========================================
echo 💾 步骤 3/5: 备份原文件...
echo ========================================

if exist "src\views\Monitor.vue" (
    copy /Y "src\views\Monitor.vue" "src\views\Monitor.vue.backup" >nul
    echo ✅ 已备份原文件到 Monitor.vue.backup
) else (
    echo ⚠️  原文件不存在，将创建新文件
)

echo.

:: 步骤 4: 提示手动下载
echo ========================================
echo 📥 步骤 4/5: 替换Monitor.vue
echo ========================================
echo.
echo ⚠️  请手动完成以下操作:
echo.
echo 1. 从输出文件中找到 "Monitor_Complete.vue"
echo 2. 复制其全部内容
echo 3. 替换到 src\views\Monitor.vue
echo.
echo 或者使用Git命令:
echo    git apply monitor_update.patch
echo.

pause

:: 步骤 5: 生成使用说明
echo.
echo ========================================
echo 📖 步骤 5/5: 生成使用说明...
echo ========================================

(
echo # 🚁 实时监控功能使用说明
echo.
echo ## ✅ 部署完成
echo.
echo 实时监控功能已成功部署！
echo.
echo ## 🔑 下一步：配置高德地图Key
echo.
echo 1. 访问 https://console.amap.com/
echo 2. 注册/登录账号
echo 3. 创建应用并获取 Web端^(JS API^) 的Key
echo 4. 编辑 `.env.development` 文件，将 `YOUR_AMAP_KEY_HERE` 替换为你的Key
echo.
echo ## 🚀 启动项目
echo.
echo ```bash
echo npm run dev
echo ```
echo.
echo 访问: http://localhost:5173/monitor
echo.
echo ## 📝 文件说明
echo.
echo - `src/views/Monitor.vue` - 实时监控组件
echo - `src/views/Monitor.vue.backup` - 原文件备份
echo - `.env.development` - 环境配置
echo.
echo ## 🔧 后端WebSocket消息格式
echo.
echo ```json
echo {
echo   "type": "position_update",
echo   "drones": [
echo     {
echo       "droneId": 1,
echo       "longitude": 121.4737,
echo       "latitude": 31.2304,
echo       "altitude": 100,
echo       "speed": 15.5,
echo       "batteryLevel": 85,
echo       "status": "flying"
echo     }
echo   ]
echo }
echo ```
echo.
echo ## 🐛 故障排查
echo.
echo ### 地图不显示
echo - 检查高德地图Key是否正确
echo - 打开浏览器控制台查看错误
echo.
echo ### WebSocket连接失败
echo - 确认后端服务已启动
echo - 检查端口配置
) > MONITOR_README.md

echo ✅ 使用说明已生成
echo.

:: 完成提示
echo.
echo ==========================================
echo 🎉 部署完成！
echo ==========================================
echo.
echo 📋 已完成的操作:
echo   ✅ 安装了必要的依赖
echo   ✅ 配置了环境变量
echo   ✅ 备份了原文件
echo   ✅ 生成了使用说明
echo.
echo 🔑 下一步操作:
echo   1. 复制 Monitor_Complete.vue 的内容到 src/views/Monitor.vue
echo   2. 编辑 .env.development，填入高德地图Key
echo   3. 运行 npm run dev 启动项目
echo   4. 访问 http://localhost:5173/monitor
echo.
echo 📖 详细说明: MONITOR_README.md
echo.
echo ⚠️  备份文件: src/views/Monitor.vue.backup
echo.

pause
