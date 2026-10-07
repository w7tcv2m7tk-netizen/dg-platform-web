-- Read-only structural reference for independent rehearsal comparison.
SELECT jsonb_build_object(
  'table', (SELECT jsonb_build_object('kind',c.relkind,'persistence',c.relpersistence,
    'access_method',a.amname,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
    'partition',c.relispartition,'replica_identity',c.relreplident,'options',c.reloptions)
    FROM pg_class c JOIN pg_am a ON a.oid=c.relam
    WHERE c.oid='public.ai_worker_provisioning_receipts'::regclass),
  'columns', (SELECT jsonb_agg(jsonb_build_object('name',a.attname,'position',a.attnum,
    'type',format_type(a.atttypid,a.atttypmod),'typmod',a.atttypmod,'not_null',a.attnotnull,
    'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated,
    'collation',col.collname,'local',a.attislocal,'inherited',a.attinhcount,
    'dimensions',a.attndims,'missing',a.atthasmissing,'dropped',a.attisdropped,
    'datetime_precision',ic.datetime_precision) ORDER BY a.attnum)
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    LEFT JOIN pg_collation col ON col.oid=a.attcollation
    LEFT JOIN information_schema.columns ic ON ic.table_schema='public'
      AND ic.table_name='ai_worker_provisioning_receipts' AND ic.column_name=a.attname
    WHERE a.attrelid='public.ai_worker_provisioning_receipts'::regclass AND a.attnum>0),
  'constraints', (SELECT jsonb_agg(jsonb_build_object('name',conname,'type',contype,
    'definition',pg_get_constraintdef(oid),'column_numbers',conkey,'validated',convalidated,'enforced',conenforced,
    'deferrable',condeferrable,'deferred',condeferred,'local',conislocal,
    'inherited',coninhcount,'no_inherit',connoinherit) ORDER BY conname)
    FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass),
  'indexes', (SELECT jsonb_agg(jsonb_build_object('definition',pg_get_indexdef(i.indexrelid),
    'primary',i.indisprimary,'unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,
    'live',i.indislive,'clustered',i.indisclustered,'predicate',pg_get_expr(i.indpred,i.indrelid),
    'expressions',pg_get_expr(i.indexprs,i.indrelid),'options',c.reloptions,
    'opclasses',ARRAY(SELECT o.opcname FROM unnest(i.indclass::oid[]) WITH ORDINALITY x(oid,n)
      JOIN pg_opclass o ON o.oid=x.oid ORDER BY x.n)) ORDER BY pg_get_indexdef(i.indexrelid))
    FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
    WHERE i.indrelid='public.ai_worker_provisioning_receipts'::regclass),
  'inheritance', (SELECT count(*) FROM pg_inherits
    WHERE inhrelid='public.ai_worker_provisioning_receipts'::regclass
      OR inhparent='public.ai_worker_provisioning_receipts'::regclass),
  'triggers', (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.ai_worker_provisioning_receipts'::regclass),
  'rules', (SELECT count(*) FROM pg_rewrite WHERE ev_class='public.ai_worker_provisioning_receipts'::regclass),
  'policies', (SELECT count(*) FROM pg_policy WHERE polrelid='public.ai_worker_provisioning_receipts'::regclass)
) AS shape;
