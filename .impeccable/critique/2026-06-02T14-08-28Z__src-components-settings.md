---
target: src/components/settings
total_score: 24
p0_count: 0
p1_count: 2
p2_count: 2
p3_count: 1
timestamp: 2026-06-02T14-08-28Z
slug: src-components-settings
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | 错误 Toast 4 秒自动消失，删除首次点击零反馈，搜索无 loading 态 |
| 2 | Match System / Real World | 3 | 金融术语恰当，"份额""成本价"符合散户认知 |
| 3 | User Control and Freedom | 3 | 删除有撤销，弹窗可 Esc 关闭，但搜索中无法取消 |
| 4 | Consistency and Standards | 3 | 按钮风格统一，编辑态视觉提示不足 |
| 5 | Error Prevention | 3 | 搜索选择制，删除二次确认，但表单必填项缺少明确标记 |
| 6 | Recognition Rather Than Recall | 2 | 可编辑单元格无视觉暗示，纯图标按钮无文字标签，缺少工具提示 |
| 7 | Flexibility and Efficiency of Use | 2 | 无键盘快捷键，无批量操作，无拖拽排序 |
| 8 | Aesthetic and Minimalist Design | 3 | 表格布局干净，金色强调色克制得当，无装饰性噪声 |
| 9 | Error Recovery | 2 | 错误消息仅告知问题，不提供修复建议 |
| 10 | Help and Documentation | 1 | 无工具提示、无上下文帮助、无空状态引导 |
| **Total** | | **24/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM**: 不会被一眼认出是 AI 生成的。没有渐变文字、毛玻璃卡片、hero-metric 模板。配色克制，布局务实。但存在两个 AI 味道的痕迹：(1) 空状态的文案"暂无持仓"过于通用；(2) Toast 组件的定位和行为模式是典型的"默认实现"。

**Deterministic scan**: 0 项发现。

## What's Working

1. 添加持仓的三步流程设计得当（搜索 → 选择 → 填写）
2. 删除的二次确认 + 撤销模式优于标准 confirm 弹窗
3. 金色强调色的克制使用，只出现在焦点态和主操作按钮

## Priority Issues

### [P1] 错误反馈机制失效
错误 Toast 位于页面顶部，用户操作区域在中部弹窗内。视觉距离远，且 4 秒后自动消失。
**Fix**: 将错误反馈内联到弹窗内部，延长自动消失时间。

### [P1] 删除操作首次点击无反馈
confirmDelete 状态切换的视觉变化可能不够醒目。
**Fix**: 第一次点击时按钮变为红色背景 + "确认删除"文字，行加淡红色背景。

### [P2] 可编辑单元格缺少发现性
份额和成本价列可编辑，但视觉上和普通文本完全一样。
**Fix**: hover 时显示铅笔图标，空值时显示"点击编辑"占位文字。

### [P2] 弹窗内缺少必填项标识和操作引导
搜索框没有标注"必填"，用户可能直接输入代码后点添加。
**Fix**: placeholder 改为"输入代码或名称，从列表中选择"，添加按钮在 newSecid 为空时置灰。

### [P3] 空状态缺乏引导性
"暂无持仓"没有引导用户下一步操作。
**Fix**: 空状态包含"添加持仓"按钮。

## Persona Red Flags

**Alex (Power User)**: 无键盘快捷键，无批量导入，编辑必须逐个单元格点击。
**Jordan (First-Timer)**: + 按钮纯图标无标签，可编辑单元格无视觉暗示，空状态无引导。
**Sam (Accessibility)**: 可编辑单元格切换依赖鼠标，搜索下拉用 onMouseDown 可能干扰屏幕阅读器。
