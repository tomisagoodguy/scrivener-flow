# Refactor ParseDocx Action

## Goal

Decompose the monolithic `parseDocx.ts` (372 LOC) into smaller, testable modules. Extract complex parsing logic for personnel, payments, and redemption details into dedicated extractor functions.

## Context

The `src/app/actions/parseDocx.ts` file handles docx parsing, HTML conversion, regex extraction, and complex business logic for identifying roles and financial details. This makes it hard to maintain and test.

## Plan

1. Extract types into `src/domain/case/types.ts`.
2. Create separate extractor modules under `src/lib/docx-parser/extractors/`.
   - `extractPersonnel.ts`
   - `extractPayments.ts`
   - `extractRedemption.ts`
   - `extractBasicInfo.ts`
3. Update `parseDocx.ts` to coordinate these extractors.
