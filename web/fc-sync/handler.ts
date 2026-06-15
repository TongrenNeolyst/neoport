import { syncOnce } from "../scripts/sync-reports-from-neolyst";

// FC event 函数入口：定时触发时跑一次同步
export async function handler(_event: Buffer, _context: unknown) {
  // 同步最近 10 分钟内发布的报告（定时 5 分钟一次，10 分钟窗口留余量，幂等去重）
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const result = await syncOnce(since);
  const msg = `synced=${result.synced} skipped=${result.skipped} errors=${result.errors.length}`;
  console.log(`[fc-sync] ${msg}`);
  return { statusCode: 200, body: msg };
}
