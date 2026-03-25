// =========================================================
// MOBILE HEALTHCARE - ENTERPRISE MASTER SCHEMA (v3.8)
// FEATURES: GROUP ENTITY DETAILS (FAMILY/CORP), DIAGNOSTICS, INVENTORY
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

// 5. SUBSCRIPTION MODULE (v3.8 Updated with Group Entity Details)
Table subscription_plans {
  id uuid [pk]
  plan_name varchar [not null]
  plan_type_id uuid [ref: > lookups.id] 
  price decimal [not null]
  max_members int [default: 1]
  duration_days int [not null]
  is_active boolean [default: true]
}

// Representing the Group Entity (Family Unit or Company)
Table subscription_accounts {
  id uuid [pk]
  account_name text [not null, note: "Family Name or Company Name"]
  registration_no text [note: "Business Reg No or Family File ID"]
  plan_id uuid [ref: > subscription_plans.id]

  // Group Specific Details
  billing_address text
  contact_email text
  contact_phone text
  whatsapp_no text
  start_date date
  end_date date
  status_id uuid [ref: > lookups.id]

  // Note: Patients/members are added via a separate membership flow.
  // Subscription account CRUD does NOT assign member patients.
}

Table subscription_members {
  id uuid [pk]
  subscription_account_id uuid [ref: > subscription_accounts.id]
  patient_id uuid [ref: > patients.id]
  joined_at timestamptz [default: `now()`]

  // Note: member patients are added via a separate membership flow,
  // not from the subscription account (Family/Corporate) CRUD screen.
}

// 6. FLEET & TEAMS
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
  gender text
  gender_id uuid [ref: > lookups.id]
  address text
  has_insurance boolean [default: false]
  has_guardian boolean [default: false]
  guardian_name text
  guardian_email text
  guardian_whatsapp_no text
  guardian_contact_no text
  guardian_relationship text
  billing_recipient_id uuid [ref: > lookups.id]
}

// 8. OPD & QUEUE
Table opd_queue {
  id uuid [pk]
  patient_id uuid [ref: > patients.id]
  token_no serial
  status text [default: "Waiting"]
  status_id uuid [ref: > lookups.id]
  visit_date timestamptz [default: `now()`]
}

// 9. BOOKINGS & CLINICAL VISITS
Table bookings {
  id uuid [pk]
  patient_id uuid [ref: > patients.id]
  team_id uuid [ref: > medical_teams.id]
  scheduled_date timestamptz
  status text [default: "Pending"]
  status_id uuid [ref: > lookups.id]
  location_gps text
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

// 10. DIAGNOSTICS & LABS
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
  lab_name text
  result_report_url text 
  result_received_at timestamptz
}

// 11. INVENTORY & NURSE STOCK
Table medicines {
  id uuid [pk]
  name text [not null]
  generic_name text
  selling_price decimal [not null]
  uom text
  uom_id uuid [ref: > lookups.id]
  min_stock_level int
}

Table inventory_batches {
  id uuid [pk]
  medicine_id uuid [ref: > medicines.id]
  batch_no text [not null]
  expiry_date timestamptz [not null]
  quantity int [not null]
  buying_price decimal [not null]
  location_type text
  location_type_id uuid [ref: > lookups.id] 
  location_id uuid 
}

Table stock_transfers {
  id uuid [pk]
  medicine_id uuid [ref: > medicines.id]
  batch_id uuid [ref: > inventory_batches.id]
  from_location_id uuid
  to_location_id uuid 
  quantity int
  status text [default: "Pending"]
  status_id uuid [ref: > lookups.id]
  transferred_by uuid [ref: > users.id]
  created_at timestamptz [default: `now()`]
}

// 12. BILLING & DISPENSING
Table invoices {
  id uuid [pk]
  booking_id uuid [ref: > bookings.id, null]
  patient_id uuid [ref: > patients.id]
  total_amount decimal
  consultation_total decimal
  medicine_total decimal
  travel_cost decimal
  payment_status text [default: "Unpaid"]
  payment_status_id uuid [ref: > lookups.id]
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