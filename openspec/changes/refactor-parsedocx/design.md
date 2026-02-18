# Refactoring Design for ParseDocx

## Architecture

- **Raw Processing**: `mammoth` conversion remains, but preprocessing logic (HTML -> structured text) moves to `src/lib/docx-parser/preprocessor.ts`.
- **Extractors**: Functional core logic. Pure functions: `(text: string) -> Result`.
- **Orchestrator**: `parseDocx` action remains the entry point but delegates logic.

## Modules

- `src/domain/case/types.ts`: Shared types.
- `src/lib/docx-parser/preprocessor.ts`: `processHtml(html: string) -> string`
- `src/lib/docx-parser/extractors/personnel.ts`: `extractPersonnelInfo(text: string) -> ParsedPersonnel`
- `src/lib/docx-parser/extractors/financials.ts`: `extractPayments(text: string) -> ParsedPayments`
- `src/lib/docx-parser/extractors/redemptions.ts`: `extractRedemption(text: string) -> ParsedRedemption`

## Constraints

- Must maintain existing regex logic exactly to avoid regression (unless bugs found).
- Keep `mammoth` dependency isolated in the preprocessing step if possible.
