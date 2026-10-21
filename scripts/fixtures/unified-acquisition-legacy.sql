-- Synthetic pre-migration rows: duplicate metadata claims and unknown ownership.
INSERT INTO organisations (id, name, slug, updated_at) VALUES ('synthetic-migration-tenant', 'Synthetic migration tenant', 'synthetic-migration-tenant', now());
INSERT INTO growth_prospects (id, organisation_id, business_name, metadata, updated_at) VALUES
('synthetic-migration-a', 'synthetic-migration-tenant', 'Legacy duplicate A', '{"providerRefs":{"abn":"10000000003"}}', now()),
('synthetic-migration-b', 'synthetic-migration-tenant', 'Legacy duplicate B', '{"abn":"10 000 000 003"}', now()),
('synthetic-migration-orphan', NULL, 'Unknown ownership', '{"providerRefs":{"abn":"10000000003"}}', now());
