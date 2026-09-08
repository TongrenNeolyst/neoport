/**
 * 中银同步函数入口。
 *
 * FC 最高只提供 nodejs20，而 @supabase/supabase-js 建 client 时要求全局
 * WebSocket——Node 22 才原生带。缺了它 createClient 直接抛
 * "Node.js 20 detected without native WebSocket support"，函数每次触发都失败。
 * 这里在加载 handler 之前把 ws 挂上去，ws 由 esbuild 打进同一个 bundle。
 */
import WS from "ws";

if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket = WS;
}

export { handler } from "./handler";
