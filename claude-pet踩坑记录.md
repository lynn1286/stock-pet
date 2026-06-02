# claude-pet 踩坑记录

从 claude-pet 源码中整理的开发陷阱，分五类。

---

## 一、窗口与进程层面

### 1. setVisibleOnAllWorkspaces 会抢焦点
`main.js:93-96`。默认调用会在 UIElement ↔ Foreground 之间做进程类型转换，导致别的 App 间歇性"切不过去"。必须传 `skipTransformProcessType: true`。这个 bug 是时序竞态，时好时坏，极难排查。

### 2. tray.getBounds() 创建瞬间返回假值
`new Tray()` 后立刻读 bounds 得到 `{x:0, y:屏幕高}`，要延迟 2s 才是真实位置。刘海机型还会把状态项排到刘海后面。主控制入口改成右键宠物，不依赖托盘。

### 3. 运行中移动 .app 会黑框破图
进程运行时素材路径固定，从 `dist` 拖到 `/Applications` 会导致立绘加载断裂。必须先退出再移动。

### 4. arm64 必须签名
Apple 芯片下未签名的 `.app` 会被判"已损坏"。electron-builder 跳过签名后，必须补 ad-hoc `codesign --force --deep --sign -`。

---

## 二、状态机与数据流

### 5. 启动时重放上次状态
`prevState` 初值 `null` → 首次推送被当成"状态转换" → 开机自启重放上次的"完成"音和横幅。修法：启动时先播种 `prevState`，渲染端用 `booted` 闸抑制首帧声音和通知。

### 6. busy 必须三个 hook
`UserPromptSubmit` 只在回合开头触发一次。授权批准后没有 hook 把状态从 `waiting` 切回 `busy`，会卡死在"等你"。加了 `PreToolUse` / `PostToolUse` → busy。

### 7. 升级提醒无限叫
最早 `waiting` 不分类型，Claude 空闲等输入（每 60s 一个 Notification）也被当成要授权。修法：只有权限阻塞型才升级、封顶 3 次、点宠物即停。

### 8. state.json 原子写入
先写临时文件 `state.json.$$`，再 `mv` 覆盖。直接写 `state.json` 会导致 `fs.watch` 读到写了一半的 JSON。

---

## 三、拖拽与交互

### 9. -webkit-app-region: drag 吞滚轮
整窗设成拖拽区后，页面收不到 `wheel` 事件，滚轮缩放失效。改成 JS + IPC 手动拖拽。

### 10. 拖拽中切 App → 宠物粘住鼠标
`window` 的 `mouseup` 只在指针落在窗口内才触发。切走或甩出窗口 → `mouseup` 丢失 → `setInterval` 永不 `clearInterval`。修法：Pointer Events + `setPointerCapture` + `lostpointercapture` 兜底。

### 11. pet 变量名撞 window.pet
`contextBridge` 暴露的全局变量不可配置。渲染层 `const pet = getElementById('pet')` 同名会导致整个 `renderer.js` 语法报错。接口改叫 `window.petAPI`。

---

## 四、脚本与接线

### 12. hook 脚本永远 exit 0
`PreToolUse` hook 返回非零会挡住 Claude 的工具调用。宠物脚本必须永远成功退出。

### 13. notify-hook 的 stdin 陷阱
用 `python3 - <<'PY'` 写 hook 时，heredoc 把脚本本身当 stdin 喂给 python。改成纯 bash `grep -oE` 解决。

### 14. open -a 不认 bundle id
含大写字母的 bundle id 被误判成应用名走 `open -a` → 失败。判定改成"≥3 段反向域名就走 `open -b`"。

---

## 五、构建与发版

### 15. IPC 三层必须同步
renderer 调 `window.petAPI.X` / preload 暴露 / main `ipcMain.on` 三层必须齐全，缺一层渲染端报错白屏。

### 16. dmg 打包 npmmirror 缺件 404
shell 设了 `ELECTRON_BUILDER_BINARIES_MIRROR=npmmirror` 时，npmmirror 缺 `dmg-builder` 的 arch bundle 会 404。本地构建要 `env -u ELECTRON_BUILDER_BINARIES_MIRROR`。
