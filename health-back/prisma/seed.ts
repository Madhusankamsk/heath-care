/// <reference types="node" />

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = "superadmin@health.local";
  const superAdminPassword = "SuperAdmin@123";

  // Ensure core roles exist
  await prisma.role.upsert({
    where: { roleName: "Admin" },
    update: { description: "System administrator" },
    create: { roleName: "Admin", description: "System administrator" },
  });

  const superAdminRole = await prisma.role.upsert({
    where: { roleName: "SuperAdmin" },
    update: { description: "Super administrator (all privileges)" },
    create: {
      roleName: "SuperAdmin",
      description: "Super administrator (all privileges)",
    },
  });

  // Ensure a baseline permission list exists (extend as needed)
  const permissionKeys = [
    "admin:access",
    "super_admin:access",

    "roles:list",
    "roles:read",
    "roles:create",
    "roles:update",
    "roles:delete",

    "permissions:list",
    "permissions:read",
    "permissions:create",
    "permissions:attach",
    "permissions:detach",

    "profiles:list",
    "profiles:read",
    "profiles:create",
    "profiles:update",
    "profiles:deactivate",
    "profiles:delete",

    "vehicles:list",
    "vehicles:read",
    "vehicles:create",
    "vehicles:update",
    "vehicles:delete",

    "patients:list",
    "patients:read",
    "patients:create",
    "patients:update",
    "patients:delete",

    "medical_teams:list",
    "medical_teams:read",
    "medical_teams:create",
    "medical_teams:update",
    "medical_teams:delete",

    "bookings:list",
    "bookings:read",
    "bookings:create",
    "bookings:update",
    "bookings:delete",
    "bookings:scope_own",
    "bookings:scope_all",
    "opd:list",
    "opd:read",
    "opd:create",
    "opd:update",
    "opd:delete",
    "opd:manage_doctors",
    "opd:pick",

    "dispatch:list",
    "dispatch:read",
    "dispatch:update",

    "files:upload",
    "files:delete",

    "invoices:read",
    "invoices:scope_own",
    "invoices:scope_all",

    "inventory:list",
    "inventory:read",
    "inventory:create",
    "inventory:update",
    "inventory:delete",
    "inventory:batches:manage",
    "inventory:substores:manage",
    "inventory:movements:manage",

    "lab:list",
    "lab:read",

    "dashboard:tile_bookings_pending",
    "dashboard:tile_bookings_accepted",
    "dashboard:tile_dispatch_upcoming",
    "dashboard:tile_dispatch_ongoing",
    "dashboard:tile_opd_waiting",
    "dashboard:tile_lab_pending",

    "dashboard:tile_count_patients",
    "dashboard:tile_count_bookings",
    "dashboard:tile_count_vehicles",
    "dashboard:tile_stat_revenue",
    "dashboard:tile_stat_outstanding",

    "dashboard:global_search",
  ] as const;

  for (const permissionKey of permissionKeys) {
    await prisma.permission.upsert({
      where: { permissionKey },
      update: {},
      create: { permissionKey },
    });
  }

  // Ensure plan type lookups required by subscription plans
  const subTypeCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "SUB_TYPE" },
    update: {},
    create: { categoryName: "SUB_TYPE" },
  });
  const subTypeValues = [
    { lookupKey: "INDIVIDUAL", lookupValue: "Individual" },
    { lookupKey: "FAMILY", lookupValue: "Family" },
    { lookupKey: "CORPORATE", lookupValue: "Corporate" },
  ] as const;
  for (const item of subTypeValues) {
    await prisma.lookup.upsert({
      where: { categoryId_lookupKey: { categoryId: subTypeCategory.id, lookupKey: item.lookupKey } },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: subTypeCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const genderCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "GENDER" },
    update: {},
    create: { categoryName: "GENDER" },
  });
  for (const item of [
    { lookupKey: "MALE", lookupValue: "Male" },
    { lookupKey: "FEMALE", lookupValue: "Female" },
    { lookupKey: "OTHER", lookupValue: "Other" },
  ] as const) {
    await prisma.lookup.upsert({
      where: { categoryId_lookupKey: { categoryId: genderCategory.id, lookupKey: item.lookupKey } },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: genderCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const inventoryLocationTypeCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "INVENTORY_LOCATION_TYPE" },
    update: {},
    create: { categoryName: "INVENTORY_LOCATION_TYPE" },
  });
  for (const item of [
    { lookupKey: "WAREHOUSE", lookupValue: "Warehouse" },
    { lookupKey: "NURSE", lookupValue: "Nurse" },
    { lookupKey: "VEHICLE", lookupValue: "Vehicle" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: {
          categoryId: inventoryLocationTypeCategory.id,
          lookupKey: item.lookupKey,
        },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: inventoryLocationTypeCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const transferStatusCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "TRANSFER_STATUS" },
    update: {},
    create: { categoryName: "TRANSFER_STATUS" },
  });
  for (const item of [
    { lookupKey: "PENDING", lookupValue: "Pending" },
    { lookupKey: "COMPLETED", lookupValue: "Completed" },
    { lookupKey: "CANCELLED", lookupValue: "Cancelled" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: {
          categoryId: transferStatusCategory.id,
          lookupKey: item.lookupKey,
        },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: transferStatusCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const medicineUomCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "MEDICINE_UOM" },
    update: {},
    create: { categoryName: "MEDICINE_UOM" },
  });
  for (const item of [
    { lookupKey: "TAB", lookupValue: "Tablet" },
    { lookupKey: "PCS", lookupValue: "Pieces" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: {
          categoryId: medicineUomCategory.id,
          lookupKey: item.lookupKey,
        },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: medicineUomCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const patientTypeCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "PATIENT_TYPE" },
    update: {},
    create: { categoryName: "PATIENT_TYPE" },
  });
  for (const item of [
    { lookupKey: "SUBSCRIPTION", lookupValue: "Subscription" },
    { lookupKey: "ONE_TIME", lookupValue: "One Time" },
  ] as const) {
    await prisma.lookup.upsert({
      where: { categoryId_lookupKey: { categoryId: patientTypeCategory.id, lookupKey: item.lookupKey } },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: patientTypeCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const billingRecipientCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "BILLING_RECIPIENT" },
    update: {},
    create: { categoryName: "BILLING_RECIPIENT" },
  });
  for (const item of [
    { lookupKey: "PATIENT", lookupValue: "Patient" },
    { lookupKey: "GUARDIAN", lookupValue: "Guardian" },
    { lookupKey: "COMPANY", lookupValue: "Company" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: { categoryId: billingRecipientCategory.id, lookupKey: item.lookupKey },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: billingRecipientCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const subscriptionAccountStatusCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "SUBSCRIPTION_ACCOUNT_STATUS" },
    update: {},
    create: { categoryName: "SUBSCRIPTION_ACCOUNT_STATUS" },
  });
  for (const item of [
    { lookupKey: "ACTIVE", lookupValue: "Active" },
    { lookupKey: "PENDING", lookupValue: "Pending" },
    { lookupKey: "SUSPENDED", lookupValue: "Suspended" },
    { lookupKey: "EXPIRED", lookupValue: "Expired" },
    { lookupKey: "CANCELLED", lookupValue: "Cancelled" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: {
          categoryId: subscriptionAccountStatusCategory.id,
          lookupKey: item.lookupKey,
        },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: subscriptionAccountStatusCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const invoicePaymentStatusCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "INVOICE_PAYMENT_STATUS" },
    update: {},
    create: { categoryName: "INVOICE_PAYMENT_STATUS" },
  });
  for (const item of [
    { lookupKey: "UNPAID", lookupValue: "Unpaid" },
    { lookupKey: "PARTIAL", lookupValue: "Partial" },
    { lookupKey: "PAID", lookupValue: "Paid" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: {
          categoryId: invoicePaymentStatusCategory.id,
          lookupKey: item.lookupKey,
        },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: invoicePaymentStatusCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const invoiceTypeCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "INVOICE_TYPE" },
    update: {},
    create: { categoryName: "INVOICE_TYPE" },
  });
  for (const item of [
    { lookupKey: "MEMBERSHIP", lookupValue: "Membership" },
    { lookupKey: "VISIT", lookupValue: "Visit" },
    { lookupKey: "OPD", lookupValue: "OPD" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: {
          categoryId: invoiceTypeCategory.id,
          lookupKey: item.lookupKey,
        },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: invoiceTypeCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const bookingTypeCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "BOOKING_TYPE" },
    update: {},
    create: { categoryName: "BOOKING_TYPE" },
  });
  for (const item of [
    { lookupKey: "VISIT", lookupValue: "Visit" },
    { lookupKey: "OPD", lookupValue: "OPD" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: {
          categoryId: bookingTypeCategory.id,
          lookupKey: item.lookupKey,
        },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: bookingTypeCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const paymentMethodCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "PAYMENT_METHOD" },
    update: {},
    create: { categoryName: "PAYMENT_METHOD" },
  });
  for (const item of [
    { lookupKey: "CASH", lookupValue: "Cash" },
    { lookupKey: "CARD", lookupValue: "Card" },
    { lookupKey: "ONLINE", lookupValue: "Online" },
    { lookupKey: "BANK_TRANSFER", lookupValue: "Bank transfer" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: { categoryId: paymentMethodCategory.id, lookupKey: item.lookupKey },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: paymentMethodCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const paymentPurposeCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "PAYMENT_PURPOSE" },
    update: {},
    create: { categoryName: "PAYMENT_PURPOSE" },
  });
  for (const item of [
    { lookupKey: "INDIVIDUAL_MEMBERSHIP", lookupValue: "Individual membership" },
    { lookupKey: "FAMILY_PACKAGE_PAYMENT", lookupValue: "Family package payment" },
    { lookupKey: "CORPORATE_SUBSCRIPTION", lookupValue: "Corporate subscription / member fees" },
    { lookupKey: "OTHER", lookupValue: "Other" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: { categoryId: paymentPurposeCategory.id, lookupKey: item.lookupKey },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: paymentPurposeCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const accountTransactionTypeCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "ACCOUNT_TRANSACTION_TYPE" },
    update: {},
    create: { categoryName: "ACCOUNT_TRANSACTION_TYPE" },
  });
  for (const item of [
    { lookupKey: "DEBIT", lookupValue: "Debit" },
    { lookupKey: "CREDIT", lookupValue: "Credit" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: {
          categoryId: accountTransactionTypeCategory.id,
          lookupKey: item.lookupKey,
        },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: accountTransactionTypeCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  // Attach ALL permissions to SuperAdmin role (idempotent)
  const allPermissions = await prisma.permission.findMany({
    select: { id: true },
  });

  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({
      roleId: superAdminRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  // Ensure a default company settings row exists (white-label configuration)
  const existingCompanySettings = await prisma.companySettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (!existingCompanySettings) {
    await prisma.companySettings.create({
      data: {
        companyName: "Health Scan",
        companyEmail: "support@healthscan.com",
        currencyCode: "LKR",
        invoicePrefix: "INV-",
        isSetupCompleted: false,
      },
    });
  }

  const passwordHash = await bcrypt.hash(superAdminPassword, 10);

  // Create super admin user if not exists (with full details)
  const superAdminUser = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      fullName: "Super Admin",
      phoneNumber: "+10000000000",
      roleId: superAdminRole.id,
      isActive: true,
      baseConsultationFee: 0,
    },
    create: {
      fullName: "Super Admin",
      email: superAdminEmail,
      password: passwordHash,
      phoneNumber: "+10000000000",
      roleId: superAdminRole.id,
      isActive: true,
      baseConsultationFee: 0,
    },
  });

  const adminRoleForInventory = await prisma.role.findUnique({
    where: { roleName: "Admin" },
    select: { id: true },
  });

  const inventoryAgent = await prisma.user.upsert({
    where: { email: "inventory.agent@health.local" },
    update: {
      fullName: "Inventory Agent",
      phoneNumber: "+10000000001",
      roleId: adminRoleForInventory?.id ?? superAdminRole.id,
      isActive: true,
      baseConsultationFee: 0,
    },
    create: {
      fullName: "Inventory Agent",
      email: "inventory.agent@health.local",
      password: passwordHash,
      phoneNumber: "+10000000001",
      roleId: adminRoleForInventory?.id ?? superAdminRole.id,
      isActive: true,
      baseConsultationFee: 0,
    },
  });

  // Ensure admin role also has booking-related permissions for dashboard usage
  const adminRole = await prisma.role.findUnique({
    where: { roleName: "Admin" },
    select: { id: true },
  });
  if (adminRole) {
    const bookingPermissions = await prisma.permission.findMany({
      where: {
        permissionKey: {
          in: [
            "bookings:list",
            "bookings:read",
            "bookings:create",
            "bookings:update",
            "bookings:delete",
            "bookings:scope_own",
            "bookings:scope_all",
            "invoices:read",
            "invoices:scope_all",
            "opd:list",
            "opd:read",
            "opd:create",
            "opd:update",
            "opd:delete",
            "opd:manage_doctors",
            "opd:pick",
            "lab:list",
            "lab:read",
            "dashboard:tile_bookings_pending",
            "dashboard:tile_bookings_accepted",
            "dashboard:tile_dispatch_upcoming",
            "dashboard:tile_dispatch_ongoing",
            "dashboard:tile_opd_waiting",
            "dashboard:tile_lab_pending",
            "dashboard:tile_count_patients",
            "dashboard:tile_count_bookings",
            "dashboard:tile_count_vehicles",
            "dashboard:tile_stat_revenue",
            "dashboard:tile_stat_outstanding",
            "dashboard:global_search",
            "patients:list",
            "patients:read",
          ],
        },
      },
      select: { id: true },
    });
    await prisma.rolePermission.createMany({
      data: bookingPermissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
      skipDuplicates: true,
    });

    const dispatchPermissions = await prisma.permission.findMany({
      where: {
        permissionKey: {
          in: [
            "dispatch:list",
            "dispatch:read",
            "dispatch:update",
            "medical_teams:list",
            "medical_teams:read",
            "vehicles:list",
            "vehicles:read",
          ],
        },
      },
      select: { id: true },
    });
    await prisma.rolePermission.createMany({
      data: dispatchPermissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
      skipDuplicates: true,
    });

    const inventoryPermissions = await prisma.permission.findMany({
      where: {
        permissionKey: {
          in: [
            "inventory:list",
            "inventory:read",
            "inventory:create",
            "inventory:update",
            "inventory:delete",
            "inventory:batches:manage",
            "inventory:substores:manage",
            "inventory:movements:manage",
          ],
        },
      },
      select: { id: true },
    });
    await prisma.rolePermission.createMany({
      data: inventoryPermissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  const doctorBookingStatusCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "DOCTOR_BOOKING_STATUS" },
    update: {},
    create: { categoryName: "DOCTOR_BOOKING_STATUS" },
  });
  for (const item of [
    { lookupKey: "PENDING", lookupValue: "Pending" },
    { lookupKey: "ACCEPTED", lookupValue: "Accepted" },
    { lookupKey: "REJECTED", lookupValue: "Rejected" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: { categoryId: doctorBookingStatusCategory.id, lookupKey: item.lookupKey },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: doctorBookingStatusCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const opdStatusCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "OPD_STATUS" },
    update: {},
    create: { categoryName: "OPD_STATUS" },
  });
  for (const item of [
    { lookupKey: "WAITING", lookupValue: "Waiting" },
    { lookupKey: "IN_CONSULTATION", lookupValue: "In Consultation" },
    { lookupKey: "COMPLETED", lookupValue: "Completed" },
    { lookupKey: "CANCELLED", lookupValue: "Cancelled" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: { categoryId: opdStatusCategory.id, lookupKey: item.lookupKey },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: opdStatusCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const dispatchStatusCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "DISPATCH_STATUS" },
    update: {},
    create: { categoryName: "DISPATCH_STATUS" },
  });
  for (const item of [
    { lookupKey: "IN_TRANSIT", lookupValue: "In transit" },
    { lookupKey: "ARRIVED", lookupValue: "Arrived" },
    { lookupKey: "DIAGNOSTIC", lookupValue: "Diagnostic" },
    { lookupKey: "COMPLETED", lookupValue: "Completed" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: { categoryId: dispatchStatusCategory.id, lookupKey: item.lookupKey },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: dispatchStatusCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const labSampleStatusCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "LAB_SAMPLE_STATUS" },
    update: {},
    create: { categoryName: "LAB_SAMPLE_STATUS" },
  });
  for (const item of [
    { lookupKey: "COLLECTED", lookupValue: "Collected" },
    { lookupKey: "SENT_TO_LAB", lookupValue: "Sent to lab" },
    { lookupKey: "RESULTS_PENDING", lookupValue: "Results pending" },
    { lookupKey: "COMPLETED", lookupValue: "Completed" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: { categoryId: labSampleStatusCategory.id, lookupKey: item.lookupKey },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: labSampleStatusCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  const labSampleTypeCategory = await prisma.lookupCategory.upsert({
    where: { categoryName: "LAB_SAMPLE_TYPE" },
    update: {},
    create: { categoryName: "LAB_SAMPLE_TYPE" },
  });
  for (const item of [
    { lookupKey: "BLOOD", lookupValue: "Blood" },
    { lookupKey: "URINE", lookupValue: "Urine" },
    { lookupKey: "STOOL", lookupValue: "Stool" },
    { lookupKey: "SWAB", lookupValue: "Swab" },
    { lookupKey: "SPUTUM", lookupValue: "Sputum" },
    { lookupKey: "OTHER", lookupValue: "Other" },
  ] as const) {
    await prisma.lookup.upsert({
      where: {
        categoryId_lookupKey: { categoryId: labSampleTypeCategory.id, lookupKey: item.lookupKey },
      },
      update: { lookupValue: item.lookupValue, isActive: true },
      create: {
        categoryId: labSampleTypeCategory.id,
        lookupKey: item.lookupKey,
        lookupValue: item.lookupValue,
        isActive: true,
      },
    });
  }

  // --- Demo data for Bookings tab preview ---
  // Vehicle
  const vehicle = await prisma.vehicle.upsert({
    where: { vehicleNo: "MH-1001" },
    update: { model: "Toyota Hiace" },
    create: {
      vehicleNo: "MH-1001",
      model: "Toyota Hiace",
      status: "Available",
    },
  });

  // Team
  const team = await prisma.medicalTeam.upsert({
    where: { id: "team-demo-001" },
    update: { teamName: "Primary Response Team", vehicleId: vehicle.id },
    create: {
      id: "team-demo-001",
      teamName: "Primary Response Team",
      vehicleId: vehicle.id,
    },
  });

  // Ensure demo medical team has members so dispatch assignment is available in UI previews
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: superAdminUser.id } },
    update: { isLead: true },
    create: { teamId: team.id, userId: superAdminUser.id, isLead: true },
  });
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: inventoryAgent.id } },
    update: { isLead: false },
    create: { teamId: team.id, userId: inventoryAgent.id, isLead: false },
  });

  // Sample patient
  const patient = await prisma.patient.upsert({
    where: { nicOrPassport: "NIC-900001" },
    update: {
      fullName: "Nimal Perera",
      contactNo: "+94771234567",
      address: "Colombo 05",
      shortName: "Nimal",
      hasInsurance: true,
      hasGuardian: false,
    },
    create: {
      nicOrPassport: "NIC-900001",
      fullName: "Nimal Perera",
      contactNo: "+94771234567",
      address: "Colombo 05",
      shortName: "Nimal",
      hasInsurance: true,
      hasGuardian: false,
    },
  });

  const doctorStatusPending = await prisma.lookup.findFirst({
    where: { categoryId: doctorBookingStatusCategory.id, lookupKey: "PENDING" },
    select: { id: true },
  });
  const doctorStatusAccepted = await prisma.lookup.findFirst({
    where: { categoryId: doctorBookingStatusCategory.id, lookupKey: "ACCEPTED" },
    select: { id: true },
  });
  const bookingTypeVisit = await prisma.lookup.findFirst({
    where: { categoryId: bookingTypeCategory.id, lookupKey: "VISIT" },
    select: { id: true },
  });
  if (!bookingTypeVisit?.id) {
    throw new Error("BOOKING_TYPE/VISIT lookup missing");
  }

  // 2 demo bookings (requested doctor = super admin for dashboard preview)
  await prisma.booking.upsert({
    where: { id: "booking-demo-001" },
    update: {
      patientId: patient.id,
      bookingRemark: "Demo accepted visit",
      requestedDoctorId: superAdminUser.id,
      doctorStatusId: doctorStatusAccepted?.id ?? null,
      bookingTypeId: bookingTypeVisit.id,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    create: {
      id: "booking-demo-001",
      patientId: patient.id,
      bookingRemark: "Demo accepted visit",
      requestedDoctorId: superAdminUser.id,
      doctorStatusId: doctorStatusAccepted?.id ?? null,
      bookingTypeId: bookingTypeVisit.id,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.booking.upsert({
    where: { id: "booking-demo-002" },
    update: {
      patientId: patient.id,
      bookingRemark: "Awaiting doctor response",
      requestedDoctorId: superAdminUser.id,
      doctorStatusId: doctorStatusPending?.id ?? null,
      bookingTypeId: bookingTypeVisit.id,
      scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
    create: {
      id: "booking-demo-002",
      patientId: patient.id,
      bookingRemark: "Awaiting doctor response",
      requestedDoctorId: superAdminUser.id,
      doctorStatusId: doctorStatusPending?.id ?? null,
      bookingTypeId: bookingTypeVisit.id,
      scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  const individualPlanType = await prisma.lookup.findFirst({
    where: { categoryId: subTypeCategory.id, lookupKey: "INDIVIDUAL" },
    select: { id: true },
  });
  if (individualPlanType) {
    await prisma.subscriptionPlan.upsert({
      where: { id: "plan-demo-001" },
      update: {
        planName: "Basic Individual",
        planTypeId: individualPlanType.id,
        price: 2500,
        maxMembers: 1,
        durationDays: 30,
        isActive: true,
      },
      create: {
        id: "plan-demo-001",
        planName: "Basic Individual",
        planTypeId: individualPlanType.id,
        price: 2500,
        maxMembers: 1,
        durationDays: 30,
        isActive: true,
      },
    });
  }

  const uomTab = await prisma.lookup.findFirst({
    where: { categoryId: medicineUomCategory.id, lookupKey: "TAB" },
    select: { id: true },
  });
  const uomPcs = await prisma.lookup.findFirst({
    where: { categoryId: medicineUomCategory.id, lookupKey: "PCS" },
    select: { id: true },
  });
  const locationWarehouse = await prisma.lookup.findFirst({
    where: { categoryId: inventoryLocationTypeCategory.id, lookupKey: "WAREHOUSE" },
    select: { id: true },
  });
  const locationNurse = await prisma.lookup.findFirst({
    where: { categoryId: inventoryLocationTypeCategory.id, lookupKey: "NURSE" },
    select: { id: true },
  });
  const transferCompleted = await prisma.lookup.findFirst({
    where: { categoryId: transferStatusCategory.id, lookupKey: "COMPLETED" },
    select: { id: true },
  });

  const medicineParacetamol = await prisma.medicine.upsert({
    where: { id: "medicine-demo-001" },
    update: {
      name: "Paracetamol 500mg",
      genericName: "Paracetamol",
      sellingPrice: 12.5,
      uom: "TAB",
      uomId: uomTab?.id ?? null,
      minStockLevel: 100,
    },
    create: {
      id: "medicine-demo-001",
      name: "Paracetamol 500mg",
      genericName: "Paracetamol",
      sellingPrice: 12.5,
      uom: "TAB",
      uomId: uomTab?.id ?? null,
      minStockLevel: 100,
    },
  });

  const itemSyringe = await prisma.medicine.upsert({
    where: { id: "medicine-demo-002" },
    update: {
      name: "Syringe 5ml",
      genericName: "__ITEM__:Disposable Syringe",
      sellingPrice: 35,
      uom: "PCS",
      uomId: uomPcs?.id ?? null,
      minStockLevel: 50,
    },
    create: {
      id: "medicine-demo-002",
      name: "Syringe 5ml",
      genericName: "__ITEM__:Disposable Syringe",
      sellingPrice: 35,
      uom: "PCS",
      uomId: uomPcs?.id ?? null,
      minStockLevel: 50,
    },
  });

  const now = new Date();
  const nextYear = new Date(now.getFullYear() + 1, 11, 31);
  const nextTwoYears = new Date(now.getFullYear() + 2, 5, 30);

  const mainParacetamolBatch = await prisma.inventoryBatch.upsert({
    where: { id: "inv-batch-demo-001" },
    update: {
      medicineId: medicineParacetamol.id,
      batchNo: "PCM-001",
      expiryDate: nextYear,
      quantity: 500,
      buyingPrice: 6.75,
      locationType: "WAREHOUSE",
      locationTypeId: locationWarehouse?.id ?? null,
      locationId: null,
    },
    create: {
      id: "inv-batch-demo-001",
      medicineId: medicineParacetamol.id,
      batchNo: "PCM-001",
      expiryDate: nextYear,
      quantity: 500,
      buyingPrice: 6.75,
      locationType: "WAREHOUSE",
      locationTypeId: locationWarehouse?.id ?? null,
      locationId: null,
    },
  });

  await prisma.inventoryBatch.upsert({
    where: { id: "inv-batch-demo-002" },
    update: {
      medicineId: itemSyringe.id,
      batchNo: "SYR-001",
      expiryDate: nextTwoYears,
      quantity: 200,
      buyingPrice: 18.5,
      locationType: "WAREHOUSE",
      locationTypeId: locationWarehouse?.id ?? null,
      locationId: null,
    },
    create: {
      id: "inv-batch-demo-002",
      medicineId: itemSyringe.id,
      batchNo: "SYR-001",
      expiryDate: nextTwoYears,
      quantity: 200,
      buyingPrice: 18.5,
      locationType: "WAREHOUSE",
      locationTypeId: locationWarehouse?.id ?? null,
      locationId: null,
    },
  });

  await prisma.inventoryBatch.upsert({
    where: { id: "inv-batch-demo-003" },
    update: {
      medicineId: medicineParacetamol.id,
      batchNo: "PCM-001",
      expiryDate: nextYear,
      quantity: 40,
      buyingPrice: 6.75,
      locationType: "NURSE",
      locationTypeId: locationNurse?.id ?? null,
      locationId: inventoryAgent.id,
    },
    create: {
      id: "inv-batch-demo-003",
      medicineId: medicineParacetamol.id,
      batchNo: "PCM-001",
      expiryDate: nextYear,
      quantity: 40,
      buyingPrice: 6.75,
      locationType: "NURSE",
      locationTypeId: locationNurse?.id ?? null,
      locationId: inventoryAgent.id,
    },
  });

  await prisma.stockTransfer.upsert({
    where: { id: "stock-transfer-demo-001" },
    update: {
      medicineId: medicineParacetamol.id,
      batchId: mainParacetamolBatch.id,
      fromLocationId: "MAIN_STORE",
      toLocationId: inventoryAgent.id,
      quantity: 40,
      status: "Completed",
      statusId: transferCompleted?.id ?? null,
      transferredById: superAdminUser.id,
    },
    create: {
      id: "stock-transfer-demo-001",
      medicineId: medicineParacetamol.id,
      batchId: mainParacetamolBatch.id,
      fromLocationId: "MAIN_STORE",
      toLocationId: inventoryAgent.id,
      quantity: 40,
      status: "Completed",
      statusId: transferCompleted?.id ?? null,
      transferredById: superAdminUser.id,
    },
  });

  console.log("Super admin seeded.");
  console.log("Email:", superAdminEmail);
  console.log("Password:", superAdminPassword);
  console.log("Role:", superAdminRole.roleName);
  console.log("Permissions attached:", allPermissions.length);
  console.log("Demo data seeded: vehicle, team, patient, bookings.");
  console.log("Subscription plan types and demo plan seeded.");
  console.log("Inventory demo data seeded: medicines, items, batches, substore, transfer.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

