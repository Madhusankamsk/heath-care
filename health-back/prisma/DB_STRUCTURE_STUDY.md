# Health Backend DB Structure (Study Notes)

This document summarizes the **current database design** from `health-back/prisma/schema.prisma`.

## Tech + Source of Truth

- Database: PostgreSQL
- ORM schema: Prisma
- Source file: `health-back/prisma/schema.prisma`
- Dynamic enum-style values are mostly handled through `LookupCategory` + `Lookup` tables.

## Domain Modules and Tables

### 1) Access Control

- `Role` - role master (admin, doctor, etc.)
- `Permission` - permission master
- `RolePermission` - many-to-many bridge between roles and permissions
- `User` - manual-auth user account, linked to `Role`

Key relation:
- One `Role` -> many `User`
- `Role` <-> `Permission` via `RolePermission`

### 2) Team and Fleet

- `Vehicle` - ambulance/vehicle master
- `MedicalTeam` - team assigned to one vehicle
- `TeamMember` - users inside a medical team
- `DispatchRecord` - dispatch entry for a booking with a vehicle
- `DispatchAssignment` - users assigned to a dispatch

Key relation:
- One `Vehicle` -> many `MedicalTeam`
- One `Booking` -> many `DispatchRecord`
- One `DispatchRecord` -> many `DispatchAssignment`

### 3) Patients, Visits, Diagnostics

- `Patient` - patient master record
- `Booking` - appointment/booking for patient
- `VisitRecord` - clinical outcome of a booking (1:1 by unique `bookingId`)
- `DiagnosticReport` - uploaded diagnostic file/report
- `LabSample` - sample collection and result tracking
- `OpdQueue` - OPD queue tokens/status per patient

Key relation:
- One `Patient` -> many `Booking`
- One `Booking` -> zero/one `VisitRecord`
- One `VisitRecord` -> many `DiagnosticReport`, `LabSample`

### 4) Subscription and Membership

- `SubscriptionPlan` - plan definition (type, price, duration, max members)
- `SubscriptionAccount` - organization/family account under a plan
- `SubscriptionMember` - patient membership in an account

Key relation:
- One `SubscriptionPlan` -> many `SubscriptionAccount`
- One `SubscriptionAccount` <-> many `Patient` via `SubscriptionMember`

### 5) Inventory and Dispensing

- `Medicine` - medicine master
- `InventoryBatch` - stock batch with location and expiry
- `StockTransfer` - stock movement between locations
- `DispensedMedicine` - medicines dispensed in a visit

Key relation:
- One `Medicine` -> many `InventoryBatch`
- One `InventoryBatch` -> many `StockTransfer`, `DispensedMedicine`
- One `VisitRecord` -> many `DispensedMedicine`

### 6) Billing and Ledger

- `Invoice` - billing document linked to booking/patient/subscription account
- `Payment` - payment rows for invoices
- `PaymentCollectorSettlement` - settlement snapshots for collectors by date/method
- `AccountTransaction` - account or patient ledger entries

Key relation:
- One `Invoice` -> many `Payment`
- `AccountTransaction` can belong to a `Patient` or `SubscriptionAccount`

### 7) Configuration and Lookup

- `CompanySettings` - white-label/company config
- `LookupCategory` - groups of lookup values
- `Lookup` - dynamic key/value lookup records used across many modules

Common lookup-driven fields:
- booking status
- doctor status
- payment method and purpose
- invoice payment status
- gender, billing recipient
- vehicle status, dispatch status
- lab sample status
- plan/account status

## Core Relationship Snapshot

- `User` belongs to `Role`
- `Patient` has `Booking`, `VisitRecord`, `Invoice`, diagnostics, lab samples
- `Booking` can reference `requestedDoctor` (`User`) and dispatch records
- `VisitRecord` links booking + patient and drives clinical + dispense + diagnostics flows
- `Invoice` supports both:
  - patient billing
  - subscription-account billing
- `Lookup` provides centralized status/type vocab across tables

## Important Constraints to Remember

- Many IDs are UUID primary keys.
- Bridge tables with uniqueness:
  - `RolePermission` composite PK (`roleId`, `permissionId`)
  - `SubscriptionMember` unique (`subscriptionAccountId`, `patientId`)
  - `TeamMember` unique (`teamId`, `userId`)
- `VisitRecord.bookingId` is unique -> enforces one visit record per booking.
- `PaymentCollectorSettlement` has unique (`collectorId`, `settledDate`, `paymentMethodKey`).
- Several tables include indexes on foreign keys/status fields for filtering.

## Study Path (Suggested)

1. Start with `Patient` -> `Booking` -> `VisitRecord` flow.
2. Then study `Invoice` + `Payment` + `AccountTransaction` billing flow.
3. Next cover dispatch: `Vehicle` -> `DispatchRecord` -> `DispatchAssignment`.
4. Finally, map all status/type fields back to `LookupCategory` + `Lookup`.

## Keep This Up to Date

When schema changes:
- update this file based on `schema.prisma`
- cross-check with latest migration in `health-back/prisma/migrations/`
