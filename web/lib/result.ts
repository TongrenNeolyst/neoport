/**
 * 统一的结果类型，用于 Server Actions 和 repo 层返回值
 *
 * @example
 * // 成功
 * return { ok: true, data: user };
 *
 * // 失败
 * return { ok: false, error: "Invalid email or password." };
 */

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * 创建成功结果
 */
export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

/**
 * 创建失败结果
 */
export function err<T = never>(error: string): Result<T> {
  return { ok: false, error };
}

/**
 * 类型守卫：检查是否为成功结果
 */
export function isOk<T>(result: Result<T>): result is { ok: true; data: T } {
  return result.ok === true;
}

/**
 * 类型守卫：检查是否为失败结果
 */
export function isErr<T>(result: Result<T>): result is { ok: false; error: string } {
  return result.ok === false;
}

/**
 * 获取数据，失败时抛出错误
 */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) {
    return result.data;
  }
  throw new Error(result.error);
}

/**
 * 获取数据，失败时返回默认值
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  return result.ok ? result.data : defaultValue;
}
