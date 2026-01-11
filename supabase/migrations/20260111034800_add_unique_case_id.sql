ALTER TABLE milestones ADD CONSTRAINT milestones_case_id_key UNIQUE (case_id);
ALTER TABLE financials ADD CONSTRAINT financials_case_id_key UNIQUE (case_id);
