ALTER TABLE contract_clauses ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE contract_clauses ADD COLUMN tags text[] DEFAULT '{}';
