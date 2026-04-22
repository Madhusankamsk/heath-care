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

/** Default product name on PDFs; legacy "Moodify Health" from DB is normalized here. */
const BRAND_NAME = "Health Scan";

/** Shown on subscription invoices (not duplicated from company header). */
const SUBSCRIPTION_SUPPORT_EMAIL = "support@healthscan.com";

const COL = {
  headerBg: "#0f766e",
  headerSub: "#ccfbf1",
  muted: "#525252",
  border: "#e5e5e5",
  accent: "#0d9488",
  rowAlt: "#fafafa",
};

function dash(s: string | null | undefined) {
  const t = s?.trim();
  return t && t.length > 0 ? t : "—";
}

/** Prefer company settings, but always show Health Scan instead of legacy Moodify Health. */
function resolveDisplayCompanyName(company: CompanyRow | null): string {
  const raw = company?.companyName?.trim();
  if (!raw) {
    return BRAND_NAME;
  }
  if (/^moodify\s*health$/i.test(raw)) {
    return BRAND_NAME;
  }
  return raw;
}

export function buildSubscriptionInvoicePdfBuffer(
  company: CompanyRow | null,
  invoice: InvoicePdfRow,
): Promise<Buffer> {
  const currency = company?.currencyCode?.trim() || "LKR";
  const displayName = resolveDisplayCompanyName(company);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const headerH = 86;

    doc.rect(0, 0, pageW, headerH).fill(COL.headerBg);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22).text(displayName, 48, 26, {
      align: "center",
      width: pageW - 96,
    });
    doc.font("Helvetica").fontSize(10).fillColor(COL.headerSub).text("Subscription invoice", 48, 56, {
      align: "center",
      width: pageW - 96,
    });

    doc.y = headerH + 28;
    doc.fillColor(COL.muted).fontSize(9);
    if (company?.companyAddress) {
      doc.text(company.companyAddress, { align: "center" });
    }
    if (company?.companyPhone) {
      doc.text(company.companyPhone, { align: "center" });
    }
    doc.moveDown(1);

    doc.fillColor("#171717").font("Helvetica-Bold").fontSize(12).text("Invoice details", { underline: false });
    doc.moveDown(0.35);
    doc.font("Helvetica").fontSize(10).fillColor("#262626");
    doc.text(`Invoice ID: ${invoice.id}`);
    doc.text(`Date: ${invoice.createdAt.toLocaleString()}`);
    doc.text(`Status: ${invoice.paymentStatusLookup?.lookupValue ?? invoice.paymentStatus}`);
    doc.moveDown(0.8);

    const boxTop = doc.y;
    doc.rect(48, boxTop, pageW - 96, 1).fill(COL.accent);
    doc.y = boxTop + 12;

    doc.fillColor("#171717").font("Helvetica-Bold").fontSize(11).text("Bill to");
    doc.moveDown(0.35);
    doc.font("Helvetica").fontSize(10).fillColor("#404040");

    if (invoice.patient) {
      doc.text(invoice.patient.fullName);
      if (invoice.patient.nicOrPassport) {
        doc.text(`NIC / Passport: ${invoice.patient.nicOrPassport}`);
      }
      if (invoice.patient.contactNo) {
        doc.text(`Contact: ${invoice.patient.contactNo}`);
      }
    } else if (invoice.subscriptionAccount) {
      const acc = invoice.subscriptionAccount;
      doc.text(dash(acc.accountName));
      if (acc.registrationNo?.trim()) {
        doc.text(`Registration: ${acc.registrationNo}`);
      }
      if (acc.billingAddress?.trim()) {
        doc.text(`Address: ${acc.billingAddress}`);
      }
      const contactLine = [acc.contactPhone, acc.contactEmail, acc.whatsappNo]
        .map((x) => x?.trim())
        .filter(Boolean)
        .join(" · ");
      if (contactLine) {
        doc.text(`Contact: ${contactLine}`);
      }
      doc.text(`Plan: ${acc.plan.planName}`);
    } else {
      doc.text("—");
    }

    if (invoice.patient && invoice.subscriptionAccount) {
      doc.moveDown(0.25);
      doc.text(`Account: ${dash(invoice.subscriptionAccount.accountName)}`);
      doc.text(`Plan: ${invoice.subscriptionAccount.plan.planName}`);
    }

    doc.moveDown(0.6);
    const afterBillY = doc.y;

    doc.rect(48, boxTop + 8, pageW - 96, afterBillY - boxTop - 8 + 8).strokeColor(COL.border).lineWidth(0.5).stroke();
    doc.y = afterBillY + 8;

    doc.moveDown(0.4);
    const summaryTop = doc.y;
    doc.rect(48, summaryTop, pageW - 96, 112).fillAndStroke(COL.rowAlt, COL.border);

    const labelX = 58;
    const valueX = pageW - 180;
    let rowY = summaryTop + 14;

    const row = (label: string, value: string, bold = false) => {
      doc.fillColor("#404040").font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
      doc.text(label, labelX, rowY, { width: 280 });
      doc.text(value, valueX, rowY, { width: 120, align: "right" });
      rowY += 18;
    };

    row(`Subtotal (${currency})`, invoice.consultationTotal.toString());
    row(`Total (${currency})`, invoice.totalAmount.toString());
    row(`Paid (${currency})`, invoice.paidAmount.toString());
    doc.fillColor(COL.accent);
    row(`Balance due (${currency})`, invoice.balanceDue.toString(), true);

    doc.y = summaryTop + 120;
    doc.moveDown(1.2);

    doc.font("Helvetica").fontSize(8).fillColor("#a3a3a3").text(`Support: ${SUBSCRIPTION_SUPPORT_EMAIL}`, {
      align: "center",
    });
    doc.moveDown(0.35);
    doc.text(`Thank you · ${BRAND_NAME}`, {
      align: "center",
    });

    doc.end();
  });
}

type VisitInvoicePdfRow = {
  id: string;
  createdAt: Date;
  totalAmount: { toString(): string };
  paidAmount: { toString(): string };
  balanceDue: { toString(): string };
  consultationTotal: { toString(): string };
  medicineTotal: { toString(): string };
  travelCost: { toString(): string };
  paymentStatus: string;
  patient: {
    fullName: string;
    nicOrPassport: string | null;
    contactNo: string | null;
  } | null;
  booking: { scheduledDate: Date | null } | null;
  paymentStatusLookup: { lookupValue: string } | null;
  invoiceTypeLookup?: { lookupKey: string } | null;
};

function visitInvoicePdfSubtitle(invoice: VisitInvoicePdfRow): string {
  const k = invoice.invoiceTypeLookup?.lookupKey;
  if (k === "OPD") return "OPD invoice";
  if (k === "IN_HOUSE") return "In-house nursing invoice";
  return "Visit invoice";
}

/** PDF for home-visit / OPD / in-house visit invoices (booking-linked, not subscription). */
export function buildVisitInvoicePdfBuffer(
  company: CompanyRow | null,
  invoice: VisitInvoicePdfRow,
): Promise<Buffer> {
  const currency = company?.currencyCode?.trim() || "LKR";
  const displayName = resolveDisplayCompanyName(company);
  const subtitle = visitInvoicePdfSubtitle(invoice);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const headerH = 86;

    doc.rect(0, 0, pageW, headerH).fill(COL.headerBg);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22).text(displayName, 48, 26, {
      align: "center",
      width: pageW - 96,
    });
    doc.font("Helvetica").fontSize(10).fillColor(COL.headerSub).text(subtitle, 48, 56, {
      align: "center",
      width: pageW - 96,
    });

    doc.y = headerH + 28;
    doc.fillColor(COL.muted).fontSize(9);
    if (company?.companyAddress) {
      doc.text(company.companyAddress, { align: "center" });
    }
    if (company?.companyPhone || company?.companyEmail) {
      doc.text([company?.companyPhone, company?.companyEmail].filter(Boolean).join(" · "), {
        align: "center",
      });
    }
    doc.moveDown(1);

    doc.fillColor("#171717").font("Helvetica-Bold").fontSize(12).text("Invoice details", { underline: false });
    doc.moveDown(0.35);
    doc.font("Helvetica").fontSize(10).fillColor("#262626");
    doc.text(`Invoice ID: ${invoice.id}`);
    doc.text(`Date: ${invoice.createdAt.toLocaleString()}`);
    doc.text(`Status: ${invoice.paymentStatusLookup?.lookupValue ?? invoice.paymentStatus}`);
    if (invoice.booking?.scheduledDate) {
      doc.text(
        `Visit scheduled: ${invoice.booking.scheduledDate.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}`,
      );
    }
    doc.moveDown(0.8);

    const boxTop = doc.y;
    doc.rect(48, boxTop, pageW - 96, 1).fill(COL.accent);
    doc.y = boxTop + 12;

    doc.fillColor("#171717").font("Helvetica-Bold").fontSize(11).text("Bill to");
    doc.moveDown(0.35);
    doc.font("Helvetica").fontSize(10).fillColor("#404040");

    if (invoice.patient) {
      doc.text(invoice.patient.fullName);
      if (invoice.patient.nicOrPassport) {
        doc.text(`NIC / Passport: ${invoice.patient.nicOrPassport}`);
      }
      if (invoice.patient.contactNo) {
        doc.text(`Contact: ${invoice.patient.contactNo}`);
      }
    } else {
      doc.text("—");
    }

    doc.moveDown(0.6);
    const afterBillY = doc.y;

    doc.rect(48, boxTop + 8, pageW - 96, afterBillY - boxTop - 8 + 8).strokeColor(COL.border).lineWidth(0.5).stroke();
    doc.y = afterBillY + 8;

    doc.moveDown(0.4);
    const summaryTop = doc.y;
    const summaryH = 168;
    doc.rect(48, summaryTop, pageW - 96, summaryH).fillAndStroke(COL.rowAlt, COL.border);

    const labelX = 58;
    const valueX = pageW - 180;
    let rowY = summaryTop + 14;

    const row = (label: string, value: string, bold = false, accent = false) => {
      doc.fillColor(accent ? COL.accent : "#404040").font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
      doc.text(label, labelX, rowY, { width: 280 });
      doc.text(value, valueX, rowY, { width: 120, align: "right" });
      rowY += 18;
    };

    row(`Consultation / visit fee (${currency})`, invoice.consultationTotal.toString());
    row(`Diagnostic & lab / travel (${currency})`, invoice.travelCost.toString());
    row(`Medicines dispensed (${currency})`, invoice.medicineTotal.toString());
    row(`Total (${currency})`, invoice.totalAmount.toString(), true);
    row(`Paid (${currency})`, invoice.paidAmount.toString());
    row(`Balance due (${currency})`, invoice.balanceDue.toString(), true, true);

    doc.y = summaryTop + summaryH + 8;
    doc.moveDown(1.2);

    doc.font("Helvetica").fontSize(8).fillColor("#a3a3a3").text(`Thank you · ${BRAND_NAME}`, {
      align: "center",
    });

    doc.end();
  });
}
