-- 查看队列状态
select id, report_id, status, error_message, created_at
from report_distribution_queue
order by created_at desc;

-- 查看失败的历史记录
select id, report_id, recipient_email, status, error_message, created_at
from report_distribution_history
where status = 'failed'
order by created_at desc;
