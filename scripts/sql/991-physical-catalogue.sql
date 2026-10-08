
    SELECT
      ARRAY(SELECT a.attname || ':' || format_type(a.atttypid,a.atttypmod) || ':'
        || a.attnotnull::text || ':' || COALESCE(pg_get_expr(d.adbin,d.adrelid), '')
        FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
        WHERE a.attrelid='public.ai_worker_provisioning_receipts'::regclass
          AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum) AS columns,
      ARRAY(SELECT pg_get_constraintdef(oid) FROM pg_constraint
        WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
          -- PostgreSQL 18 catalogs NOT NULL constraints; attnotnull above checks them.
          AND contype <> 'n'
          AND convalidated AND NOT condeferrable ORDER BY pg_get_constraintdef(oid)) AS constraints,
      ARRAY(SELECT pg_get_indexdef(i.indexrelid) FROM pg_index i
        WHERE i.indexrelid IN ('public.ai_worker_provisioning_receipts_pkey'::regclass,
          'public.ai_worker_provisioning_window_idx'::regclass, 'public.ai_worker_pinned_name_unique'::regclass)
          AND i.indisvalid AND i.indisready AND i.indislive ORDER BY pg_get_indexdef(i.indexrelid)) AS indexes,
      (SELECT count(*)=3 AND bool_and(relkind='r' AND relpersistence='p' AND NOT relrowsecurity)
        FROM pg_class WHERE oid IN ('public._prisma_migrations'::regclass,
          'public.ai_worker_provisioning_receipts'::regclass, 'public.ai_worker_principals'::regclass))
      AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public._prisma_migrations'::regclass AND NOT tgisinternal)
      AND NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class='public._prisma_migrations'::regclass) AS safe;
