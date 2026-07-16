export interface CaseShare {
  id: string;
  case_id: string;
  shared_with: string;
  shared_by: string;
  created_at: string;
  status: 'active' | 'rejected';
  rejected_at: string | null;
}

export interface CaseShareWithUser extends CaseShare {
  shared_with_email: string | null;
  shared_with_name: string | null;
}
