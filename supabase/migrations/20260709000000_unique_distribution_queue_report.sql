-- =============================================================================
-- 修复 report_distribution_queue 队列入队幂等性失效
-- =============================================================================
-- Bug：
--   原 RPC add_to_distribution_queue 用了 ON CONFLICT DO NOTHING，
--   但既没指定列名，report_distribution_queue.report_id 上也没有 UNIQUE 约束，
--   因此 ON CONFLICT DO NOTHING 等于空操作（PG 会报 no unique or exclusion
--   constraint matching the ON CONFLICT specification）。
--
--   后果：
--     1) 同步脚本误以为 RPC 幂等，实际上每次调用如果成功都会插入新行；
--     2) 排查时容易被误导（同步脚本以为 do nothing 就安全）。
--
-- 修复：
--   1) 给 report_distribution_queue.report_id 加 UNIQUE 约束（每份报告
--      在队列表里只能有一行；同一报告多次入队会被合并）
--   2) 修正 add_to_distribution_queue 的 ON CONFLICT 写法，改为
--      ON CONFLICT (report_id) DO NOTHING，真正实现幂等
-- =============================================================================

-- 1. 加 UNIQUE 约束（如果此前有重复行，约束会加失败，需要先清理）
DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT count(*) INTO dup_count
  FROM (
    SELECT report_id
    FROM public.report_distribution_queue
    GROUP BY report_id
    HAVING count(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE NOTICE 'report_distribution_queue has % duplicate report_id groups, cleaning up', dup_count;
    -- 保留每组最新的一行（按 created_at desc），其余删除
    DELETE FROM public.report_distribution_queue q
    USING (
      SELECT id, row_number() OVER (PARTITION BY report_id ORDER BY created_at DESC) AS rn
      FROM public.report_distribution_queue
    ) d
    WHERE q.id = d.id AND d.rn > 1;
  END IF;
END $$;

-- 2. 加 UNIQUE 约束
ALTER TABLE public.report_distribution_queue
  DROP CONSTRAINT IF EXISTS report_distribution_queue_report_id_unique;
ALTER TABLE public.report_distribution_queue
  ADD CONSTRAINT report_distribution_queue_report_id_unique UNIQUE (report_id);

-- 3. 修正 RPC
CREATE OR REPLACE FUNCTION public.add_to_distribution_queue(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.report_distribution_queue (report_id, status)
  VALUES (p_report_id, 'waiting')
  ON CONFLICT (report_id) DO NOTHING;
END;
$$;

comment on function public.add_to_distribution_queue(uuid) is
  '将报告添加到自动分发队列，初始状态为 waiting；幂等操作，重复调用不会产生重复记录（依赖 report_id UNIQUE 约束）';
