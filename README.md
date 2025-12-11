# 医疗无人机资源调度系统 — 前端 (Vue 3 + Vite + TypeScript)

此仓库为医疗无人机资源调度系统的前端骨架，基于 Vue 3 + Vite + TypeScript + Element Plus。后端接口尚未就绪，当前使用内置 Mock 数据以便页面可以直接查看效果。

## 特性

- Vue 3 (Script Setup)
- Vite 构建
- Element Plus 组件库
- Pinia 状态管理
- Vue Router 4
- Axios（已封装拦截器）
- ECharts（用于仪表盘）
- 地图容器占位（`id="map-container"`）——后续接入 Cesium / 高德地图

## 已实现页面

- 登录页（`/login`）
- 仪表盘（`/dashboard`，含 ECharts 折线图 & 统计卡）
- 无人机管理（`/drones`，表格、分页、新增/编辑弹窗）
- 实时监控（`/monitor`，左侧列表 + 右侧地图占位，模拟 WebSocket 每 3 秒更新）

## 本地运行

在项目根目录执行：

```powershell
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发服务器启动后打开浏览器访问控制台显示的地址（默认 `http://localhost:5173`）。

## 环境变量

- 如需配置后端地址，可在根目录创建 `.env` 或 `.env.local` 并添加：

```
VITE_API_BASE=http://your.api.base
```

## 接入后端与地图提示

- 所有 API 在 `src/api/` 中封装：目前为 Mock（返回 `Promise.resolve(...)`），后端就绪后将这些函数替换为调用 `src/utils/request.ts` 中的 axios 实例。
- 地图占位在 `src/views/Monitor.vue` 的 `#map-container`，可在该 DOM 上初始化 Cesium 或高德地图，并在 WebSocket 回调中更新无人机位置。

## 下一步建议

1. 安装依赖并运行（见上）。
2. 如需，我可以现在为你：
   - 运行 `npm install` 并启动开发服务器（需要你的确认）。
   - 将 Mock API 切换为调用 `src/utils/request.ts` 的实现骨架。
   - 提供 Cesium / 高德接入示例（包含如何把 Pinia 的无人机位置渲染到地图上）。

如需我直接运行安装并启动（会在你的终端执行 `npm install` 和 `npm run dev`），请回复“请运行并启动”。

# RS_web_front

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
