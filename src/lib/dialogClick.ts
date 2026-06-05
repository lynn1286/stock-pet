import type { MouseEvent } from 'react';

/** 弹窗内输入框聚焦时，click 第一次只转移焦点；mousedown 可一次触发 */
export function onDialogMouseDown(e: MouseEvent, action: () => void) {
  if (e.button !== 0) return;
  action();
}
