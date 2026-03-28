import PDFDocument from "pdfkit";

type InvoicePdfRow = {
  id: string;
  createdAt: Date;
  totalAmount: { toString(): string };
  paidAmount: { toString(): string };
  balanceDue: { toString(): string };
  consultationTotal: { toString(): string };
  paymentStatus: string;
  patient: {
    fullName: string;
    nicOrPassport: string | null;
    contactNo: string | null;
  } | null;
  subscriptionAccount: {
    accountName: string | null;
    registrationNo: string | null;
    billingAddress: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    whatsappNo: string | null;
    plan: { planName: string };
  } | null;
  paymentStatusLookup: { lookupValue: string } | null;
};

type CompanyRow = {
  companyName: string;
  companyEmail: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  currencyCode: string | null;
};

function dash(s: string | null | undefined) {
  const t = s?.trim();
  return t && t.length > 0 ? t : "—";
}

export function buildSubscriptionInvoicePdfBuffer(
  company: CompanyRow | null,
  invoice: InvoicePdfRow,
): Promise<Buffer> {
  const currency = company?.currencyCode?.trim() || "LKR";

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const title = company?.companyName?.trim() || "Invoice";
    doc.fontSize(18).text(title, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#444444");
    if (company?.companyAddress) doc.text(company.companyAddress, { align: "center" });
    if (company?.companyPhone || company?.companyEmail) {
      doc.text(
        [company?.companyPhone, company?.companyEmail].filter(Boolean).join(" · "),
        { align: "center" },
      );
    }
    doc.fillColor("#000000");
    doc.moveDown(1.2);

    doc.fontSize(14).text("Subscription bill", { underline: true });
    doc.moveDown(0.6);
    doc.fontSize(10);
    doc.text(`Invoice ID: ${invoice.id}`);
    doc.text(`Date: ${invoice.createdAt.toLocaleString()}`);
    doc.text(`Status: ${invoice.paymentStatusLookup?.lookupValue ?? invoice.paymentStatus}`);
    doc.moveDown();

    doc.text("Bill to:");
    if (invoice.patient) {
      doc.text(`  ${invoice.patient.fullName}`);
      if (invoice.patient.nicOrPassport) doc.text(`  NIC / Passport: ${invoice.patient.nicOrPassport}`);
      if (invoice.patient.contactNo) doc.text(`  Contact: ${invoice.patient.contactNo}`);
    } else if (invoice.subscriptionAccount) {
      const acc = invoice.subscriptionAccount;
      doc.text(`  ${dash(acc.accountName)}`);
      if (acc.registrationNo?.trim()) doc.text(`  Registration: ${acc.registrationNo}`);
      if (acc.billingAddress?.trim()) {
        doc.text(`  Address: ${acc.billingAddress}`);
      }
      const contactLine = [acc.contactPhone, acc.contactEmail, acc.whatsappNo]
        .map((x) => x?.trim())
        .filter(Boolean)
        .join(" · ");
      if (contactLine) doc.text(`  Contact: ${contactLine}`);
      doc.text(`  Plan: ${acc.plan.planName}`);
    } else {
      doc.text("  —");
    }

    if (invoice.patient && invoice.subscriptionAccount) {
      doc.moveDown(0.3);
      doc.text(`Account: ${dash(invoice.subscriptionAccount.accountName)}`);
      doc.text(`Plan: ${invoice.subscriptionAccount.plan.planName}`);
    }

    doc.moveDown();

    const line = (label: string, value: string) => {
      doc.text(`${label}: ${value}`);
    };
    line(`Subtotal (${currency})`, invoice.consultationTotal.toString());
    line(`Total (${currency})`, invoice.totalAmount.toString());
    line(`Paid (${currency})`, invoice.paidAmount.toString());
    doc.font("Helvetica-Bold");
    line(`Balance due (${currency})`, invoice.balanceDue.toString());
    doc.font("Helvetica");

    doc.end();
  });
}
