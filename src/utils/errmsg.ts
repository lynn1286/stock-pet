const ERROR_MAP: Record<string, string> = {
  stock_already_exists: '该股票已添加',
  stock_not_found: '未找到该股票',
  config_read_error: '读取配置失败',
  network_error: '网络请求失败，请稍后重试'
}

export function userMessage(e: unknown): string {
  if (typeof e === 'string') {
    return ERROR_MAP[e] ?? '操作失败，请重试'
  }
  if (e instanceof Error) {
    return ERROR_MAP[e.message] ?? '操作失败，请重试'
  }
  return '操作失败，请重试'
}
