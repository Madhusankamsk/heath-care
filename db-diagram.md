// =========================================================
// MOBILE HEALTHCARE - ENTERPRISE MASTER SCHEMA (v3.0)
// FEATURES: WHITE-LABEL, LOOKUPS, SELF-AUTH, INVENTORY
// =========================================================

// 1. SYSTEM & COMPANY CONFIGURATION (For White-labeling)
Table company_settings {
  id uuid [pk]
  company_name text [not null]
  company_email text
  company_phone text
  company_address text
  logo_url text              // R2 Storage Link
  primary_color varchar      // e.g., "#3498db"
  secondary_color varchar    // e.g., "#2ecc71"
  currency_code varchar      // e.g., "LKR"
  travel_cost_per_km decimal [default: 0]
  tax_percentage decimal     [default: 0]
  invoice_prefix varchar     [default: "INV-"]
  is_setup_completed boolean [default: false]
  updated_at timestamptz [default: `now()`]
}

// 2. DYNAMIC LOOKUP SYSTEM (Replaces Hardcoding)
Table lookup_categories {
  id uuid [pk]
  category_name varchar [unique, note: "VEHICLE_STATUS, BOOKING_STATUS, UOM, GENDER, PAY_STATUS"]
}

Table lookups {
  id uuid [pk]
  category_id uuid [ref: > lookup_categories.id]
  lookup_key varchar [note: "ACTIVE, PENDING, TABLETS, WAREHOUSE, NURSE"]
  lookup_value text [note: "Display Name: e.g., Tablets, In-Progress"]
  is_active boolean [default: true]
}

// 3. AUTH & ROLE MANAGEMENT
Table roles {
  id uuid [pk]
  role_name varchar [unique, note: "SuperAdmin, Admin, Doctor, Nurse, Driver"]
  description text
}

Table permissions {
  id uuid [pk]
  permission_key varchar [unique]
}

Table role_permissions {
  role_id uuid [ref: > roles.id]
  permission_id uuid [ref: > permissions.id]
  indexes {
    (role_id, permission_id) [pk]
  }
}

// 4. USER MANAGEMENT (Self-Managed Auth)
Table users {
  id uuid [pk]
  full_name text [not null]
  email text [unique, not null]
  password text [not null, note: "Bcrypt Hashed"]
  role_id uuid [ref: > roles.id]
  phone_number text
  base_consultation_fee decimal [default: 0]
  is_active boolean [default: true]
  created_at timestamptz [default: `now()`]
}

// 5. FLEET & TEAMS
Table vehicles {
  id uuid [pk]
  vehicle_no text [unique, not null]
  model text
  status_id uuid [ref: > lookups.id]
}

Table medical_teams {
  id uuid [pk]
  team_name text
  vehicle_id uuid [ref: > vehicles.id]
  created_at timestamptz [default: `now()`]
}

Table team_members {
  id uuid [pk]
  team_id uuid [ref: > medical_teams.id]
  user_id uuid [ref: > users.id]
  is_lead boolean [default: false]
}

// 6. PATIENT & OPD
Table patients {
  id uuid [pk]
  nic_or_passport text [unique]
  full_name text [not null]
  dob date
  gender_id uuid [ref: > lookups.id]
  address text
  contact_no text
}

Table opd_queue {
  id uuid [pk]
  patient_id uuid [ref: > patients.id]
  token_no serial
  status_id uuid [ref: > lookups.id]
  visit_date date [default: `now()`]
}

// 7. BOOKINGS & CLINICAL VISITS
Table bookings {
  id uuid [pk]
  patient_id uuid [ref: > patients.id]
  team_id uuid [ref: > medical_teams.id]
  scheduled_date timestamptz
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

// 8. INVENTORY (THE NURSE STOCK LOGIC)
Table medicines {
  id uuid [pk]
  name text [not null]
  generic_name text
  selling_price decimal [not null]
  uom_id uuid [ref: > lookups.id]
  min_stock_level int
}

Table inventory_batches {
  id uuid [pk]
  medicine_id uuid [ref: > medicines.id]
  batch_no text [not null]
  expiry_date date [not null]
  quantity int [not null]
  buying_price decimal [not null]
  location_type_id uuid [ref: > lookups.id] // Warehouse, Nurse, Vehicle
  location_id uuid [note: "Points to User ID if location is Nurse"]
}

Table stock_transfers {
  id uuid [pk]
  medicine_id uuid [ref: > medicines.id]
  batch_id uuid [ref: > inventory_batches.id]
  from_location_id uuid
  to_location_id uuid // Target Nurse's User ID
  quantity int
  status_id uuid [ref: > lookups.id]
  transferred_by uuid [ref: > users.id]
  created_at timestamptz [default: `now()`]
}

// 9. BILLING & DISPENSING
Table invoices {
  id uuid [pk]
  booking_id uuid [ref: > bookings.id]
  patient_id uuid [ref: > patients.id]
  total_amount decimal
  consultation_total decimal
  medicine_total decimal
  travel_cost decimal
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