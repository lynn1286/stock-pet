# 会盯盘的桌宠

一只 80×80 的透明金毛，趴在桌面上帮你盯盘。涨了开心，跌了崩溃，休市就睡觉。

## 功能

- **实时行情** — 接入东方财富数据源，支持 A 股、基金、ETF 等
- **持仓管理** — 添加股票、设置持仓金额和收益，支持内联编辑和撤销删除
- **表情系统** — 金毛根据涨跌幅切换 10 种不同表情和动画
  - 🟢 大涨 / 小涨 → 开心动画 + 粒子特效
  - ⚪ 横盘 → 平静
  - 🔴 小跌 / 大跌 / 暴崩 → 崩溃动画
  - 😴 休市 → 睡觉
  - 🕐 非交易时段 → 待机
- **透明窗口** — 无边框、透明背景、始终置顶、跳过任务栏
- **拖拽移动** — 直接拖动金毛在桌面上换位置
- **系统托盘** — 托盘图标显示主股信息，支持自定义显示模式
- **跨平台** — macOS（dmg）和 Windows（msi / nsis）

## 安装

前往 [GitHub Releases](../../releases) 下载对应平台的安装包：

- **macOS**：下载 `.dmg` 文件，拖入 Applications 即可。首次打开如提示"无法验证开发者"，在 系统设置 → 隐私与安全性 中点击"仍要打开"。若提示应用已损坏，终端执行：
  ```bash
  xattr -dr com.apple.quarantine /Applications/StockPet.app
  ```
- **Windows**：下载 `.msi` 或 `.exe` 安装包，双击运行安装。

## 开发

### 环境要求

- [Node.js](https://nodejs.org/) >= 22
- [Rust](https://rustup.rs/) >= 1.77
- Tauri 2 系统依赖（[官方文档](https://v2.tauri.app/start/prerequisites/)）

### 启动

```bash
npm install
npm run tauri dev
```

### 构建

```bash
npm run tauri build
```

产物输出到 `dist/` 目录。

## CI / CD

推送到 `main` 分支时，GitHub Actions 自动在 macOS（Intel + Apple Silicon）和 Windows 上构建。构建完成后，在 Actions 页面对应运行记录的 **Artifacts** 区域下载安装包。

## 数据目录

持仓和配置保存在 `config.json`，路径因平台而异：

| 平台 | 路径 |
|---|---|
| macOS | `~/Library/Application Support/stock-pet/config.json` |
| Windows | `C:\Users\<用户名>\AppData\Roaming\stock-pet\config.json` |

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Tauri 2 |
| 前端 | React 19 + TypeScript + Vite 8 |
| 样式 | Tailwind CSS 4 |
| 后端 | Rust（Tokio + Reqwest） |

## 许可

[MIT](LICENSE)
