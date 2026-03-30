# 项目维护指引

本文件是当前项目的正式维护文档，供后续代码修改、问题排查和 agent 协作使用。

## 项目概况

- 项目名称：huaci-assistant。
- 产品定位：轻量桌面划词助手，支持回答、翻译、总结、解释。
- 技术栈：Electron 33、React 19、Vite 6、TypeScript。
- 构建方式：electron-vite 多入口构建，包含主窗口入口和划词工具栏入口。
- 打包目标：当前已配置 Windows 安装包（NSIS）构建（集成应用图标 `icon.ico`），并支持开机自启配置。
- 当前重点能力：全局快捷唤起（Toggle 模式）、剪贴板读取兜底、划词助手、AI 翻译/解释/总结/搜索、多轮上下文流式对话、思维链（Reasoning）深度支持、多模型管理与翻译模型独立、图片输入（Vision）支持。

## 核心能力

- 主窗口问答：基于剪贴板或输入补充文本发起对话，支持多轮对话上下文。
- 文本翻译：独立翻译视图，支持多种语言自动翻译。
- 内容总结：对选中文本或输入文本生成结构化总结。
- 解释说明：对文本内容做独立解释页，支持结构化布局。
- 划词助手：任意应用中选中文字后弹出极简悬浮工具栏（译、释、搜、复制）。其中“搜”直接调用默认浏览器跳转 Bing。
- 思维链（Thinking）支持：内置思维链深度控制（默认、关闭、简略、标准、深度），兼容 Qwen, DeepSeek 等支持 Reasoning 的模型。
- 全局快捷键：默认 `Alt+Space` 唤起/隐藏主窗口（Toggle 模式）。
- 托盘驻留：窗口关闭后后台运行，托盘右键菜单支持配置“开机自启”。
- 主题与设置：API Host/Key 设定、主题色（5种精选配色）、明暗模式切换。
- 多模型管理：支持手动添加多个模型到列表，在设置中选择默认模型；翻译功能可独立指定不同模型。
- 图片输入（Vision）：输入框支持 Ctrl+V 粘贴截图/图片，以 OpenAI Vision 格式（`content` 数组含 `image_url` base64）发送，支持多图多轮图文对话。
- 排版与交互：输入框支持 Shift+Enter 换行自动调节高度，全程采用 Anthropic 风格排版（Poppins + Lora 字体）。

## 目录结构概览

```text
.
├─ src/
│  ├─ main/                  # Electron 主进程：窗口、托盘、快捷键、划词服务
│  ├─ preload/               # Context Bridge 安全桥接层
│  └─ renderer/              # React 渲染层：主窗口与工具栏 UI，组件化拆分
├─ resources/                # 图标（icon.ico, tray-icon.png）与打包资源
├─ out/                      # electron-vite 构建输出
├─ dist/                     # electron-builder 打包产物
├─ electron.vite.config.ts   # Electron + Vite 多入口配置
├─ package.json              # 依赖、脚本、electron-builder 配置
├─ AGENTS.md                 # 正式维护文档
└─ walkthrough.md            # 迁移说明，占位文档
```

## 主进程（Main）结构说明

为了保持代码整洁，主进程已经进行了模块化重构：

- `src/main/index.ts`：应用入口、主窗口（`miniWindow`）管理、IPC 注册、托盘与快捷键装配。
- `src/main/selection.ts`：划词检测、工具栏窗口管理、主进程全局鼠标和命中判定（包含针对点击与失焦的 `lastHideReason` 机制）。
- `src/main/shortcut.ts`：全局快捷键注册与注销模块。
- `src/main/tray.ts`：系统托盘构建模块，包含系统“开机自启”系统级 API 接入。

## 渲染进程（Renderer）结构说明

组件拆分清晰，分为页面视图和独立功能组件：

- `src/renderer/App.tsx`：主路由入口，维护状态（聊天记录，流式文本、选段）与路由调度。
- `src/renderer/services/api.ts`：核心 API 模块。以 SSE (Server-Sent Events) 的形式解析 OpenAI 兼容接口，专门提取 `reasoning_content` 处理思维链显示。支持 `modelOverride` / `useTranslateModel` 参数实现翻译模型独立；`ChatMessage.content` 兼容纯文本和 Vision 格式数组。
- **页面视图**：
  - `ChatView.tsx`：通用的对话界面，支持多轮消息与流式思维框折叠展示。
  - `TranslateView.tsx`：专业纯净的翻译界面。
  - `SettingsView.tsx`：设置页面，含模型列表管理（添加/删除 Chip）、默认模型选择器、翻译专用模型选择器、快捷键录制。
- **核心组件**：
  - `SelectionToolbar.tsx`：划词弹出的条带 UI（与主窗口逻辑分离，有独立的 HTML/Vite 入口）。
  - `InputBar.tsx`：动态 textarea 适应多行输入，包含思维模式选择器和图片粘贴（Ctrl+V）预览条。
  - `ThinkingButton.tsx`：控制基于 budget 设定的 Thinking 表现程度。
  - `FeatureMenu.tsx` / `ClipboardPreview.tsx` 等。

## 常用命令

```bash
npm run dev
npm run build
npm run build:win
```

补充说明：

- 桌面快捷方式指向 `dist/win-unpacked/划词助手.exe`。验证打包版改动请执行 `npm run build:win`。
- 应用启用托盘驻留和单实例锁。重新验证桌面包前，务必先从系统托盘彻底退出旧实例。

## 当前稳定链路

### 主窗口链路

1. `src/main/index.ts` 创建 `miniWindow`。
2. 用户按下快捷键触发 `toggleMiniWindow()`。
3. `selection.ts` 通过剪贴板或 hook 获取内容，透过 `window-show` 通知 Renderer。
4. `src/renderer/App.tsx` 读取本地配置并套用基于 `CSS Variables` 的主题系统（`utils/theme.ts`）。
5. 输入与提交统一调用 `api.ts` 的 `streamChat` 执行 SSE 流式请求，区分 `content` 与 `reasoning_content`。当有附加图片时，`content` 以 Vision 格式数组发送。

### 划词助手链路

1. `selection-hook`（已开启 `enableClipboard: true` 后备方案）在 `selection.ts` 中监视文本选中。
2. 依据坐标，展示一个 `focusable: false`、透明非激活态（`showInactive()`）的悬浮窗（220px 宽）。
3. 主进程利用全局 `mouse-down` 对屏幕坐标进行命中比对。**命中比对算法按按钮比重 `['translate', 'explain', 'search', 'copy']` 划分，并非完全等宽**。
4. 用户若点击悬浮区域之外，触发 `lastHideReason = 'mouse-down'` 以最小防抖时延隐藏面板，防止频繁选择闪烁。
5. 命中非 `搜索/复制` 动作后，发信号隐藏框体并由 Renderer App 响应 `selection-action-trigger` 切换至指定 View 并主动发起 AI 请求。

## 划词助手的实现约束（切勿轻易回退）

1. `selection.ts` 作为 rollup chunk 模块，它的 `preload` 与 `html` 路径必须由 `index.ts` 显式透过 `configure()` 注入。
2. 工具栏窗口必须保持 `focusable: false`，使用 `showInactive()`，确保对用户原有工作窗口（如编辑器、浏览器）零焦点干涉。
3. **按钮事件拦截必须在 Main 进程**：Windows 下的透明穿透悬浮窗，React Renderer 层 `onClick` 事件极度不可靠。命中计算逻辑位于 `handleMouseDown`，请确保 UI 调整（增删按钮、修改宽度比重）与计算逻辑强同步。
4. `lastHideTime` 与 `lastHideReason`：防闪烁冷却时间机制至关重要。正常 dismiss 具有长冷却，基于全新一次 `mouse-down` 的触发有短冷却。
5. 所有主进程比较均基于 DIP 逻辑坐标 (`screen.getCursorScreenPoint()` 与窗体 Bounds)。

## 已确认的历史问题（排雷指南）

### 1. 工具栏不弹或按钮点击无效
- 优先检查打包后 `preload` 和 `html` 地址是否注入正确。
- 若只点击无响应，检查 Main 里的命中坐标分配，按钮布局是否和 `handleMouseDown` 强耦合的段落分配有出入。

### 2. Electron-Builder Windows 环境解压报错
- 因为 `selection-hook` 的重新构建可能引出 Node-GYP 或 `winCodeSign` 因为符号链接文件解读错误。
- 保证 `package.json` 中的 `npmRebuild: false`。不再需要特意剥离 `icon` 配置，现已通过标准 `.ico` 配置及依赖隔离成功。

### 3. 多轮上下文堆叠或样式残留
- `App.tsx` 中的路由在跳回 `home` 时会做强状态重置（清空 Message 和 Thinking）。若扩展新模式（如长文处理），需处理好旧状态的生命周期。

## 维护指引

1. **界面风格修改**：项目采用规范化的 CSS 变量（存放在 `global.css`）。修改圆角、阴影或文字请在此处对齐 Anthropic 美学。修改主题调色板在 `utils/theme.ts`。
2. **快捷键模块**：快捷键不再仅仅是 `show`，而是实现了切换和动态解绑重绑录制（位于 `SettingsView` 与 `shortcut.ts`），变更逻辑须两端同步。
3. **模型思考能力（Reasoning）对接**：
   - 思维链机制由 `api.ts` 支持处理，不同服务商下发格式不一。
   - 现已兼容提取 `delta.reasoning_content` 及 `delta.reasoning`，展示在特有的折叠块中（由 `ChatView` 维护展示状态）。
4. **工具栏 UI**：修改 `SelectionToolbar` 的动作后，**必须**同频修改 Main 进程中的拦截命中区域划分，因为宽度与比例写死在 Main 环境。
5. **多模型管理**：
   - 存储键：`modelList`（string 数组）、`model`（默认模型）、`translateModel`（翻译专用，空字符串表示跟随默认）。
   - `api.ts` 的 `streamChat` 接受 `options.useTranslateModel` 参数，`TranslateView` 传入此标志使翻译走独立模型。
6. **图片输入（Vision）**：
   - `InputBar` 监听 `onPaste` 事件提取 `image/*` 类型的剪贴板条目，转 base64 data URL 后存入 `attachedImages` 状态。
   - `api.ts` 的 `buildUserContent()` 负责将文本+图片组装为 OpenAI Vision 格式的 `ContentPart[]`。
   - 图片仅内存临时缓存，不做持久化。Backspace 在输入为空时可逐一删除已附加的图片。

## 最小验证清单

每次提交 / 构建前必须跑通以下流程：

1. `npm run build` 及 `npx electron-builder --win` 通过。
2. 完整从系统托盘关闭旧实例，再运行验证。
3. 鼠标划取文本，工具栏准确显示且不抢占原程序的输入光标。
4. 按 `Alt+Space` 可正常实现窗口呼出和隐藏翻转。
5. 开启 "思维模式"，输入内容测试能否正确展开流式的 `<Thinking...>` 折叠区体验。
6. 设置里更换主题能即时全局切换有效。
7. 设置中添加/删除模型，切换默认模型和翻译模型后保存，验证翻译使用独立模型、问答使用默认模型。
8. 在输入框中 Ctrl+V 粘贴截图，确认缩略图预览显示，发送后图文内容正确传递给 AI。