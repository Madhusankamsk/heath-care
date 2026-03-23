import prisma from "../prisma/client";

export async function listLookupsByCategory(categoryName: string) {
  return prisma.lookup.findMany({
    where: {
      isActive: true,
      category: { categoryName },
    },
    orderBy: { lookupValue: "asc" },
    select: { id: true, lookupKey: true, lookupValue: true },
  });
}

