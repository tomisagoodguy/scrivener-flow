-- Create guidelines table
create table if not exists guidelines (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id),
  
  role text not null, -- 賣方, 買方, etc.
  scenario text not null, -- 監護宣告, etc.
  
  legal_info text,
  required_docs text,
  processing_time text,
  special_clauses text,
  caution text
);

-- Enable RLS
alter table guidelines enable row level security;

-- Create Policies
-- Everyone (authenticated) can view all guidelines
create policy "Allow authenticated users to view all guidelines"
  on guidelines for select
  to authenticated
  using (true);

-- Everyone (authenticated) can insert guidelines
create policy "Allow authenticated users to insert guidelines"
  on guidelines for insert
  to authenticated
  with check (auth.role() = 'authenticated');

-- Creators can update their own guidelines (optional, maybe allow helpful edits from team?)
-- For now, let's allow "Everyone authenticated can update" to make it a true shared knowledge base as requested ("全部人")
create policy "Allow authenticated users to update all guidelines"
  on guidelines for update
  to authenticated
  using (true);

-- Creators can delete their own guidelines
create policy "Allow creators to delete their own guidelines"
  on guidelines for delete
  to authenticated
  using (auth.uid() = created_by);
