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

  console.log("Super admin seeded.");
  console.log("Email:", superAdminEmail);
  console.log("Password:", superAdminPassword);
  console.log("Role:", superAdminRole.roleName);
  console.log("Permissions attached:", allPermissions.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

