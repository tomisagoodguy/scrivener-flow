# Proposal: Refactor Revenue Lab Service

## Goal

Refactor `revenueLabService.ts` from a monolithic service into a layered architecture to improve maintainability, testability, and adherence to the Single Responsibility Principle (SRP). Separation of data access, business logic (calculations), and service orchestration is the primary objective.

## Capabilities

### Data Access Layer

Abstract direct Supabase DB queries into dedicated repository functions or classes. This isolates the data fetching logic from business rules.

### Domain Logic Calculator

Extract complex statistical calculations (Win Rate, Heatmap Statistics, Return Bins) into pure functions or domain services. These functions should be easily testable without mocking the database.

### Service Orchestration

Simplify `revenueLabService.ts` to act as an orchestrator that retrieves data using the Data Access Layer and processes it using the Domain Logic Calculator, returning the final DTOs.
