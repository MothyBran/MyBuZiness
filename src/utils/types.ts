// src/utils/types.ts

// ---------- Basics ----------
export type ISODate = string;   // "YYYY-MM-DD"
export type ISOTime = string;   // "HH:MM" oder "HH:MM:SS"

// ---------- Settings ----------
export type Settings = {
  id?: string;
  companyName?: string;
  headerTitle?: string;
  website?: string;
  email?: string;
  phone?: string;
  iban?: string;
  vatId?: string;
  taxNumber?: string;
  taxOffice?: string;

  currency?: string;
  currencyDefault?: string;

  // Theme / Layout
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  fontFamily?: string;
  logoUrl?: string;
  showLogo?: boolean;

  createdAt?: string;
  updatedAt?: string;
};

// ---------- Customer ----------
export type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  note?: string | null;

  addressStreet?: string | null;
  addressZip?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

// ---------- Product ----------
export type Product = {
  id: string;
  name: string;
  sku?: string | null;

  priceCents?: number;
  currency?: string;

  description?: string | null;
  kind?: string | null;          // z.B. "service" | "product"
  categoryCode?: string | null;

  // optionale Reisekosten-Felder, falls genutzt
  travelEnabled?: boolean;
  travelRateCents?: number;
  travelUnit?: string;
  travelBaseCents?: number;
  travelPerKmCents?: number;
  hourlyRateCents?: number;

  createdAt?: string;
  updatedAt?: string;
};

// ---------- Invoice & Items ----------
export type Invoice = {
  id: string;
  invoiceNo: string;
  customerId: string;

  issueDate: ISODate;      // Ausgestellt
  dueDate?: ISODate | null;

  currency?: string;

  netCents?: number;
  taxCents?: number;
  grossCents?: number;
  taxRate?: number | string;

  status?: string;         // z.B. "open" | "paid" | ...
  paidAt?: string | null;
  note?: string | null;    // <— WICHTIG: war vorher nicht im Typ

  createdAt?: string;
  updatedAt?: string;
};

export type InvoiceItem = {
  id: string;
  invoiceId: string;
  productId?: string | null;

  name: string;
  description?: string | null;

  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;

  extraBaseCents?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

// ---------- Receipt & Items ----------
export type Receipt = {
  id: string;
  receiptNo: string;

  date: ISODate;
  vatExempt?: boolean;

  currency?: string;

  netCents?: number;
  taxCents?: number;
  grossCents?: number;
  discountCents?: number;

  note?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export type ReceiptItem = {
  id: string;
  receiptId: string;
  productId?: string | null;

  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;

  extraBaseCents?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

// ---------- Appointments ----------
export type Appointment = {
  id: string;
  kind?: "appointment" | "order" | string;
  title?: string;

  date: ISODate;
  startAt?: ISOTime;
  endAt?: ISOTime | null;

  customerId?: string | null;
  customerName?: string | null;

  note?: string | null;
  status?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

// ---------- Orders / Quotes (optional falls genutzt) ----------
export type Order = { id: string; [k: string]: any };
export type Quote = { id: string; [k: string]: any };
