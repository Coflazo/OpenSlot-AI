-- Check how many slots we have and their date range
SELECT 
  COUNT(*) as total_slots,
  MIN(starts_at) as oldest_slot,
  MAX(starts_at) as newest_slot,
  DATE_TRUNC('day', MIN(starts_at)) as min_date,
  DATE_TRUNC('day', MAX(starts_at)) as max_date
FROM slots;

-- Count slots by date
SELECT 
  DATE_TRUNC('day', starts_at)::date as slot_date,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'BOOKED' THEN 1 END) as booked,
  COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END) as expired,
  COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open,
  COUNT(CASE WHEN status = 'OFFERING' THEN 1 END) as offering
FROM slots
GROUP BY DATE_TRUNC('day', starts_at)
ORDER BY slot_date;
