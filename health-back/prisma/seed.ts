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

    "files:upload",
    "files:delete",
  ] as const;

  for (const permissionKey of permissionKeys) {
    await prisma.permission.upsert({
      where: { permissionKey },
      update: {},
      create: { permissionKey },
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
        companyName: "Moodify Health",
        companyEmail: "support@moodify.health",
        currencyCode: "LKR",
        invoicePrefix: "INV-",
        isSetupCompleted: false,
      },
    });
  }

  const passwordHash = await bcrypt.hash(superAdminPassword, 10);

  // Create super admin user if not exists (with full details)
  await prisma.user.upsert({
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

  // Ensure admin role also has booking-related permissions for dashboard usage
  const adminRole = await prisma.role.findUnique({
    where: { roleName: "Admin" },
    select: { id: true },
  });
  if (adminRole) {
    const bookingPermissions = await prisma.permission.findMany({
      where: {
        permissionKey: {
          in: ["bookings:list", "bookings:read", "bookings:create", "bookings:update", "bookings:delete"],
        },
      },
      select: { id: true },
    });
    await prisma.rolePermission.createMany({
      data: bookingPermissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
      skipDuplicates: true,
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

  // Sample patient
  const patient = await prisma.patient.upsert({
    where: { nicOrPassport: "NIC-900001" },
    update: {
      fullName: "Nimal Perera",
      contactNo: "+94771234567",
      address: "Colombo 05",
    },
    create: {
      nicOrPassport: "NIC-900001",
      fullName: "Nimal Perera",
      contactNo: "+94771234567",
      address: "Colombo 05",
    },
  });

  // 2 demo bookings
  await prisma.booking.upsert({
    where: { id: "booking-demo-001" },
    update: {
      patientId: patient.id,
      teamId: team.id,
      status: "Confirmed",
      locationGps: "6.9271,79.8612",
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    create: {
      id: "booking-demo-001",
      patientId: patient.id,
      teamId: team.id,
      status: "Confirmed",
      locationGps: "6.9271,79.8612",
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.booking.upsert({
    where: { id: "booking-demo-002" },
    update: {
      patientId: patient.id,
      teamId: team.id,
      status: "Pending",
      locationGps: "6.9147,79.9730",
      scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
    create: {
      id: "booking-demo-002",
      patientId: patient.id,
      teamId: team.id,
      status: "Pending",
      locationGps: "6.9147,79.9730",
      scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  console.log("Super admin seeded.");
  console.log("Email:", superAdminEmail);
  console.log("Password:", superAdminPassword);
  console.log("Role:", superAdminRole.roleName);
  console.log("Permissions attached:", allPermissions.length);
  console.log("Demo data seeded: vehicle, team, patient, bookings.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

