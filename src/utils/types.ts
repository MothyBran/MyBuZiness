// src/utils/types.ts
export type UUID = string;

export type Customer = {
  id: string;
  name: string;        // Customer.name 
  email?: string | null;
  phone?: string | null;
  addressStreet?: string | null;
  addressZip?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Product = {
  id: string;
  name: string;          // Product.name 
  sku?: string | null;
  priceCents: number;    // Product.priceCents 
  currency?: string | null;
  description?: string | null;
  kind?: string | null;
  categoryCode?: string | null;
  hourlyRateCents?: number | null;
};

export type Invoice = {
  id: string;
  invoiceNo: string;     // Invoice.invoiceNo 
  customerId: string;
  issueDate: string;
  dueDate?: string | null;
  currency?: string | null;
  netCents: number;
  taxCents: number;
  grossCents: number;
  status?: string | null;
  paidAt?: string | null;
};

export type InvoiceItem = {
  id: string;
  invoiceId: string;      // InvoiceItem.invoiceId 
  productId?: string | null;
  name: string;           // InvoiceItem.name 
  description?: string | null;
  quantity: number;       // InvoiceItem.quantity (numeric) 
  unitPriceCents: number; // InvoiceItem.unitPriceCents 
  lineTotalCents: number; // InvoiceItem.lineTotalCents 
  extraBaseCents?: number | null;
};

export type Receipt = {
  id: string;
  receiptNo: string;     // Receipt.receiptNo 
  date: string;
  currency?: string | null;
  netCents: number;
  taxCents: number;
  grossCents: number;
  vatExempt?: boolean | null;
  note?: string | null;
  discountCents?: number | null;
};

export type ReceiptItem = {
  id: string;
  receiptId: string;      // ReceiptItem.receiptId 
  productId?: string | null;
  name: string;           // ReceiptItem.name 
  quantity: number;       // ReceiptItem.quantity 
  unitPriceCents: number; // ReceiptItem.unitPriceCents 
  lineTotalCents: number; // ReceiptItem.lineTotalCents 
  extraBaseCents?: number | null;
};

export type Quote = {
  id: string;
  quoteNo: string;       // Quote.quoteNo 
  customerId: string;
  issueDate: string;
  validUntil?: string | null;
  currency?: string | null;
  netCents: number;
  taxCents: number;
  grossCents: number;
  status?: string | null;
};

export type Order = {
  id: string;
  orderNo: string;       // Order.orderNo 
  customerId: string;
  orderDate: string;
  currency?: string | null;
  netCents: number;
  taxCents: number;
  grossCents: number;
  status?: string | null;
};

export type Appointment = {
  id: string;
  kind?: string | null;
  title?: string | null;
  date: string;
  startAt?: string | null;
  endAt?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  status?: string | null;
};

export type Settings = {
  id: string;
  companyName?: string | null;
  headerTitle?: string | null;
  ownerName?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  borderRadius?: number | null;
  fontFamily?: string | null;
  iban?: string | null;
  vatId?: string | null;
  taxNumber?: string | null;
  taxOffice?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  currency?: string | null;
  currencyDefault?: string | null;
  showLogo?: boolean | null;
  logoUrl?: string | null;
  fontColor?: string | null;
  city?: string | null;
};
