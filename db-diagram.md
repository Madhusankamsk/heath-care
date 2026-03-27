// =========================================================
// MOBILE HEALTHCARE - ENTERPRISE MASTER SCHEMA (v4.0)
// FEATURES: FINANCIALS, OUTSTANDING BALANCES, DYNAMIC DISPATCH, R2
// =========================================================

// 1. SYSTEM & COMPANY CONFIGURATION
Table company_settings {
  id uuid [pk]
  company_name text [not null]
  company_email text
  company_phone text
  company_address text
  logo_url text               
  primary_color varchar       
  secondary_color varchar     
  currency_code varchar       [default: "LKR"]
  travel_cost_per_km decimal [default: 0]
  tax_percentage decimal      [default: 0]
  invoice_prefix varchar      [default: "INV-"]
  is_setup_completed boolean [default: false]
  updated_at timestamptz [default: `now()`]
}

// 2. DYNAMIC LOOKUP SYSTEM
Table lookup_categories {
  id uuid [pk]
  category_name varchar [unique]
}

Table lookups {
  id uuid [pk]
  category_id uuid [ref: > lookup_categories.id]
  lookup_key varchar 
  lookup_value text 
  is_active boolean [default: true]
}

// 3. AUTH & ROLE MANAGEMENT
Table roles {
  id uuid [pk]
  role_name varchar [unique]
  description text
}

Table permissions {
  id uuid [pk]
  permission_key varchar [unique]
}

Table role_permissions {
  role_id uuid [ref: > roles.id]
  permission_id uuid [ref: > permissions.id]
  indexes { (role_id, permission_id) [pk] }
}

// 4. USER MANAGEMENT (Staff)
Table users {
  id uuid [pk]
  full_name text [not null]
  email text [unique, not null]
  password text [not null]
  role_id uuid [ref: > roles.id]
  phone_number text
  base_consultation_fee decimal [default: 0]
  is_active boolean [default: true]
  created_at timestamptz [default: `now()`]
}

// 5. SUBSCRIPTION MODULE (v4.0 Updated for Financials)
Table subscription_plans {
  id uuid [pk]
  plan_name varchar [not null]
  plan_type_id uuid [ref: > lookups.id] 
  price decimal [not null]
  max_members int [default: 1]
  duration_days int [not null]
  is_active boolean [default: true]
}

Table subscription_accounts {
  id uuid [pk]
  account_name text [not null]
  registration_no text
  plan_id uuid [ref: > subscription_plans.id]
  billing_address text
  contact_email text
  contact_phone text
  whatsapp_no text
  
  // FINANCIALS
  outstanding_balance decimal [default: 0] // Total unpaid amount for the group
  credit_limit decimal [default: 0]
  
  start_date date
  end_date date
  status_id uuid [ref: > lookups.id]
}

Table subscription_members {
  id uuid [pk]
  subscription_account_id uuid [ref: > subscription_accounts.id]
  patient_id uuid [ref: > patients.id]
  joined_at timestamptz [default: `now()`]
}

// 6. FLEET & MEDICAL TEAMS (Templates)
Table vehicles {
  id uuid [pk]
  vehicle_no text [unique, not null]
  model text
  status text [default: "Available"]
  status_id uuid [ref: > lookups.id]
  current_driver_id uuid [ref: > users.id]
}

Table medical_teams {
  id uuid [pk]
  team_name text
  vehicle_id uuid [ref: > vehicles.id]
}

Table team_members {
  id uuid [pk]
  team_id uuid [ref: > medical_teams.id]
  user_id uuid [ref: > users.id]
  is_lead boolean [default: false]
}

// 7. PATIENT MODULE
Table patients {
  id uuid [pk]
  nic_or_passport text [unique]
  full_name text [not null]
  short_name text
  dob timestamptz
  contact_no text
  whatsapp_no text
  gender_id uuid [ref: > lookups.id]
  address text
  
  // FINANCIALS
  outstanding_balance decimal [default: 0] // For individual walk-in patients
  
  has_insurance boolean [default: false]
  has_guardian boolean [default: false]
  guardian_name text
  guardian_email text
  guardian_whatsapp_no text
  guardian_contact_no text
  guardian_relationship text
  billing_recipient_id uuid [ref: > lookups.id]
}

// 8. BOOKINGS (Selective Doctor & Acceptance)
Table bookings {
  id uuid [pk]
  patient_id uuid [ref: > patients.id]
  requested_doctor_id uuid [ref: > users.id, null]
  doctor_status_id uuid [ref: > lookups.id] 
  scheduled_date timestamptz
  status_id uuid [ref: > lookups.id]
  booking_remark text 
}

// 9. DYNAMIC DISPATCH (Real-time Team Assignment)
Table dispatch_records {
  id uuid [pk]
  booking_id uuid [ref: > bookings.id]
  vehicle_id uuid [ref: > vehicles.id]
  dispatched_at timestamptz [default: `now()`]
  status_id uuid [ref: > lookups.id] 
}

Table dispatch_assignments {
  id uuid [pk]
  dispatch_id uuid [ref: > dispatch_records.id]
  user_id uuid [ref: > users.id] 
  is_team_leader boolean [default: false]
  assigned_at timestamptz [default: `now()`]
}

// 10. OPD & CLINICAL VISITS
Table opd_queue {
  id uuid [pk]
  patient_id uuid [ref: > patients.id]
  token_no serial
  status_id uuid [ref: > lookups.id]
  visit_date timestamptz [default: `now()`]
}

Table visit_records {
  id uuid [pk]
  booking_id uuid [ref: - bookings.id]
  patient_id uuid [ref: > patients.id]
  diagnosis text
  clinical_notes text
  vitals jsonb 
  completed_at timestamptz
}

// 11. DIAGNOSTICS & LABS
Table diagnostic_reports {
  id uuid [pk]
  patient_id uuid [ref: > patients.id]
  visit_id uuid [ref: > visit_records.id, null]
  report_name text [not null]
  report_type_id uuid [ref: > lookups.id]
  file_url text [not null] 
  uploaded_by uuid [ref: > users.id]
  uploaded_at timestamptz [default: `now()`]
}

Table lab_samples {
  id uuid [pk]
  patient_id uuid [ref: > patients.id]
  visit_id uuid [ref: > visit_records.id, null]
  sample_type text [not null]
  collected_at timestamptz [default: `now()`]
  collected_by uuid [ref: > users.id]
  status_id uuid [ref: > lookups.id] 
  result_report_url text 
}

// 12. INVENTORY
Table medicines {
  id uuid [pk]
  name text [not null]
  selling_price decimal [not null]
  uom_id uuid [ref: > lookups.id]
}

Table inventory_batches {
  id uuid [pk]
  medicine_id uuid [ref: > medicines.id]
  batch_no text [not null]
  expiry_date timestamptz [not null]
  quantity int [not null]
  buying_price decimal [not null]
  location_type_id uuid [ref: > lookups.id] 
  location_id uuid 
}

// 13. FINANCIAL MODULE (New v4.0 Logic)
Table invoices {
  id uuid [pk]
  booking_id uuid [ref: > bookings.id, null]
  patient_id uuid [ref: > patients.id]
  subscription_account_id uuid [ref: > subscription_accounts.id, null] // Linked for group billing
  
  total_amount decimal [not null]
  paid_amount decimal [default: 0]
  balance_due decimal [note: "Remaining amount for this invoice"]
  
  payment_status_id uuid [ref: > lookups.id] // UNPAID, PARTIAL, PAID
  created_at timestamptz [default: `now()`]
}

Table payments {
  id uuid [pk]
  invoice_id uuid [ref: > invoices.id]
  amount_paid decimal [not null]
  payment_method_id uuid [ref: > lookups.id] // CASH, CARD, ONLINE, CREDIT
  transaction_ref text // Bank ref or receipt number
  paid_at timestamptz [default: `now()`]
  collected_by uuid [ref: > users.id]
}

Table account_transactions {
  id uuid [pk]
  patient_id uuid [ref: > patients.id, null]
  subscription_account_id uuid [ref: > subscription_accounts.id, null]
  
  transaction_type_id uuid [ref: > lookups.id] // DEBIT (Charge), CREDIT (Payment)
  amount decimal [not null]
  description text
  created_at timestamptz [default: `now()`]
}

Table dispensed_medicines {
  id uuid [pk]
  visit_id uuid [ref: > visit_records.id]
  medicine_id uuid [ref: > medicines.id]
  batch_id uuid [ref: > inventory_batches.id]
  quantity int
  dispensed_by uuid [ref: > users.id]
  unit_price_at_time decimal
}