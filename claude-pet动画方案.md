# claude-pet 动画方案

## 核心结论

4 张静态 PNG 图片 + CSS 动画 + CSS 形状。没有用 GIF、sprite sheet、Canvas、Lottie。

## 素材

4 张 640×640 RGBA 透明背景 PNG，每个状态一张：

- `assets/idle.png` — 待命姿态
- `assets/busy.png` — 工作姿态
- `assets/waiting.png` — 等待姿态
- `assets/done.png` — 完成姿态

螃蟹本身的形态变化（表情、姿态）全靠切图，图片只负责"长什么样"。

## 动画实现

状态切换时做两件事：换图片 + 换 CSS class。

```js
petImg.src = SRC[state];   // 换一张静态 PNG
pet.classList.add(state);  // 触发对应的 CSS 动画
```

### 6 种 CSS @keyframes 动画

| 动画 | 触发条件 | 效果 | 周期 |
|---|---|---|---|
| breathe | idle / done | 缓慢上下浮动 + 微缩放，模拟呼吸 | 3.6s |
| bob | busy | 快速上下跳动，模拟忙碌 | 0.6s |
| attention | waiting | 左右摇晃 + 上下跳，模拟焦急 | 0.72s |
| celebrate | done 刚切换时 | 弹跳一次后停止 | 1.05s |
| auraPulse | busy / waiting | 身后彩色光晕呼吸闪烁 | 1.4s / 0.7s |
| dotpulse | busy | 头顶三个圆点依次跳动 | 1s |
| bubbleBounce | waiting | 对话气泡上下弹 | 0.7s |
| twinkle | celebrating | 身边四颗小星星依次闪烁 | 1s |

### 非图片元素，纯 CSS 绘制

- **光晕**（#aura）：`div` + `radial-gradient` 渐变，CSS 变量 `--aura` 按状态换色（忙=橙、等你=红、完成=绿）
- **星星**（#sparks i）：4 个 `div` + `clip-path: polygon()` 裁成八角星形
- **圆点**（#dots span）：3 个 `div` + `border-radius: 50%`

### 升级提醒（urgent）模式

等待超时时动画加速：breathe → attention 0.34s、auraPulse 0.34s，视觉上更急促。

### 请勿打扰（dnd）模式

关掉一切主动提示（气泡、光晕、圆点、星星），只保留 breathe 呼吸动画。

## 状态切换流程

```
状态切换
  ├─ 换图片（4 张静态 PNG，一张/状态）
  ├─ 换 CSS class（触发不同的 @keyframes 动画）
  ├─ 换光晕颜色（CSS 变量 --aura）
  └─ 显示/隐藏 UI 元素（气泡、圆点、星星、标签）
```

## 关键设计决策

- 不用动画 GIF：文件大、无法精细控制、无法和 CSS 动画组合
- 不用 Canvas/WebGL：复杂度高，桌面宠物不需要逐帧控制
- 不用 Lottie/SVG 动画：引入额外依赖，CSS 动画足够
- 图片和动画分离：图片只管外观，CSS 管运动，换形象只需换 4 张图
