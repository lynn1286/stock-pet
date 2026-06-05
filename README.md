# 会盯盘的桌宠

一只 80×80 的透明金毛，浮在桌面角落帮你盯盘。涨时开心，跌时崩溃，休市睡觉。数据来自东方财富，支持 A 股、基金、ETF。

## 快速开始

1. 在 [GitHub Releases](https://github.com/lynn1286/stock-pet/releases) 下载对应平台的安装包并安装。
2. 启动后，桌宠出现在桌面右下角；拖动金毛可换位置。
3. 点击菜单栏托盘图标 → **设置**，搜索并添加持仓。
4. 桌宠会根据主股涨跌幅切换动画；托盘图标旁显示当日收益。

## 日常使用

### 桌宠窗口

- **拖动**：按住金毛拖动，换到桌面任意位置。
- **动画**：按 A 股习惯（红涨绿跌）反映涨跌幅度；休市与非交易时段分别进入睡觉、待机状态。

### 系统托盘

| 操作 | 作用 |
| ---- | ---- |
| 左键单击托盘图标 | 显示 / 隐藏桌宠 |
| 右键菜单 → 显示桌宠 | 显示桌宠 |
| 右键菜单 → 隐藏桌宠 | 隐藏桌宠 |
| 右键菜单 → 设置 | 打开持仓管理窗口 |
| 右键菜单 → 退出 | 退出应用 |

托盘图标旁可显示主股当日收益（金额或收益率，可在设置中切换）。

### 设置窗口

- **添加持仓**：搜索股票 / 基金 / ETF，填写成本与数量。
- **编辑 / 删除**：表格内联编辑；删除后可撤销。
- **齿轮图标**：调整桌宠显示（主股盈亏 / 总持仓盈亏）、托盘显示（金额 / 收益率）、主股票选择。

## 功能概览

- 实时行情轮询，持仓盈亏汇总
- 透明无边框桌宠，始终置顶，不占任务栏
- macOS（dmg）与 Windows（exe）安装包

## 安装

| 系统 | 芯片 | 下载文件 |
| ---- | ---- | -------- |
| macOS | Apple Silicon（M 系列） | `会盯盘的桌宠_{version}_aarch64.dmg` |
| macOS | Intel | `会盯盘的桌宠_{version}_x64.dmg` |
| Windows | x64 | `会盯盘的桌宠_{version}_x64-setup.exe` |

不确定 Mac 芯片类型：菜单栏 → 关于本机 → 芯片，显示 Apple 为 Apple Silicon，显示 Intel 为 Intel 版。

### macOS

下载 `.dmg`，拖入「应用程序」文件夹。首次打开若提示无法验证开发者，在 **系统设置 → 隐私与安全性** 中点「仍要打开」。若提示应用已损坏：

```bash
xattr -dr com.apple.quarantine "/Applications/会盯盘的桌宠.app"
```

### Windows

下载 `.exe`，双击安装。

## 数据存储

持仓与偏好保存在本机 `config.json`，不上传云端：

| 平台 | 路径 |
| ---- | ---- |
| macOS | `~/Library/Application Support/stock-pet/config.json` |
| Windows | `C:\Users\<用户名>\AppData\Roaming\stock-pet\config.json` |

## 开发

### 环境要求

- [Node.js](https://nodejs.org/) >= 22
- [Rust](https://rustup.rs/) >= 1.77
- [Tauri 2 系统依赖](https://v2.tauri.app/start/prerequisites/)

### 常用命令

```bash
pnpm install
pnpm tauri dev      # 开发模式
pnpm tauri build    # 构建安装包
pnpm lint           # ESLint + Prettier 检查
pnpm format         # 格式化
```

构建产物位于 `src-tauri/target/release/bundle/`（dmg / exe）。

开发模式下，在设置弹窗（齿轮）底部可开关 **Mock**，用于打开右上角状态模拟窗，调试桌宠动画，不会出现在正式包中。

### CI / Release

推送到 `main` 分支时，GitHub Actions 在 macOS（Intel + Apple Silicon）和 Windows 上构建，并自动发布到 [Releases](https://github.com/lynn1286/stock-pet/releases)。Release 包含安装包（dmg / exe）、签名更新包和 `latest.json`，已安装应用可在设置内一键更新。

需在仓库 **Settings → Secrets → Actions** 配置 `TAURI_SIGNING_PRIVATE_KEY`（`~/.tauri/stock-pet.key` 全文）。

## 技术栈

| 层 | 技术 |
| -- | ---- |
| 桌面框架 | Tauri 2 |
| 前端 | React 19 + TypeScript + Vite 8 |
| 样式 | Tailwind CSS 4 |
| 后端 | Rust（Tokio + Reqwest） |

## 许可

[MIT](LICENSE)
