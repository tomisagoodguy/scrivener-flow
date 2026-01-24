# Tasks: Enhance Checklist and Export

- [ ] **Dependency Fix**

  - [ ] Run `yarn add uuid` to install missing dependency.
  - [ ] Verify `npm run dev` or `yarn build` passes without `uuid` error.
- [ ] **Rename UI Elements**

  - [ ] Update `src/app/cases/new/page.tsx` to change "讀取案件單 (.docx)" to "讀取多筆代書備忘錄(.docx)".
  - [ ] Update `src/components/features/cases/edit-case/BasicInfoSection.tsx` to change "重新讀取案件單 (.docx)" to "重新讀取代書備忘錄(.docx)" (consistent terminology).
- [ ] **Dynamic Checklist**

  - [ ] Modify `CaseCompactTodoList.tsx` to:
    - [ ] Display users' custom keys found in `todos` prop (merged with hardcoded lists).
    - [ ] Add a UI input field (e.g., "+") to allow adding a new key to the `todos` object.
    - [ ] Ensure updating a custom key persists it to Supabase.
