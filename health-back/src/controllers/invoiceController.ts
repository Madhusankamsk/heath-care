import type { Request, Response } from "express";

import prisma from "../prisma/client";
import { buildSubscriptionInvoicePdfBuffer } from "../services/invoicePdfService";

export async function getInvoicePdfHandler(req: Request, res: Response) {
  const { id } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: {
        select: { fullName: true, nicOrPassport: true, contactNo: true },
      },
      subscriptionAccount: {
        select: {
          accountName: true,
          registrationNo: true,
          billingAddress: true,
          contactEmail: true,
          contactPhone: true,
          whatsappNo: true,
          plan: { select: { planName: true } },
        },
      },
      paymentStatusLookup: { select: { lookupValue: true } },
    },
  });

  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }

  if (!invoice.subscriptionAccountId) {
    return res.status(400).json({ message: "PDF is only available for subscription invoices" });
  }

  const company = await prisma.companySettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  try {
    const pdf = await buildSubscriptionInvoicePdfBuffer(company, invoice);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${invoice.id}.pdf"`);
    return res.status(200).send(pdf);
  } catch {
    return res.status(500).json({ message: "Unable to generate PDF" });
  }
}
