"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const adminEmail = "aaa@bbb.com";
    const plainPassword = "123456";
    // Ensure an Admin role exists
    const adminRole = await prisma.role.upsert({
        where: { roleName: "Admin" },
        update: {},
        create: {
            roleName: "Admin",
            description: "System administrator",
        },
    });
    const passwordHash = await bcryptjs_1.default.hash(plainPassword, 10);
    // Create admin user if not exists
    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            fullName: "Admin",
            email: adminEmail,
            password: passwordHash,
            roleId: adminRole.id,
            isActive: true,
            baseConsultationFee: 0,
        },
    });
    console.log("Admin user seeded with email:", adminEmail);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
