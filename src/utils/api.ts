// src/utils/api.ts  (ERGÄNZEN / ANPASSEN)
import { Appointment, Customer, Invoice, InvoiceItem, Order, Product, Quote, Receipt, ReceiptItem, Settings } from "./types";

const j = (r: Response) => { if (!r.ok) throw new Error(r.statusText); return r.json(); };
const API = {
  customers: "/api/customers",
  products: "/api/products",
  invoices: "/api/invoices",
  receipts: "/api/receipts",
  quotes: "/api/quotes",
  orders: "/api/orders",
  appointments: "/api/appointments",
  settings: "/api/settings",
};

// LISTEN (bestehend)
export const getSettings = (): Promise<Settings> => fetch(API.settings).then(j);
export const getCustomers = (): Promise<Customer[]> => fetch(API.customers).then(j);
export const getProducts = (): Promise<Product[]> => fetch(API.products).then(j);
export const getInvoices = (): Promise<Invoice[]> => fetch(API.invoices).then(j);
export const getReceipts = (): Promise<Receipt[]> => fetch(API.receipts).then(j);
export const getQuotes = (): Promise<Quote[]> => fetch(API.quotes).then(j);
export const getOrders = (): Promise<Order[]> => fetch(API.orders).then(j);
export const getAppointments = (): Promise<Appointment[]> => fetch(API.appointments).then(j);

export const getAppointmentsByMonth = (yyyyMm: string): Promise<Appointment[]> =>
  fetch(`${API.appointments}?month=${encodeURIComponent(yyyyMm)}`).then(j);

export const createAppointment = (payload: Partial<Appointment>): Promise<Appointment> =>
  fetch(API.appointments, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(j);

export const updateAppointment = (id: string, payload: Partial<Appointment>): Promise<Appointment> =>
  fetch(`${API.appointments}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(j);

export const deleteAppointment = (id: string): Promise<{ ok: true }> =>
  fetch(`${API.appointments}/${id}`, { method: "DELETE" }).then(j);

// DETAILS
export const getCustomer = (id: string): Promise<Customer> => fetch(`${API.customers}/${id}`).then(j);
export const getProduct = (id: string): Promise<Product> => fetch(`${API.products}/${id}`).then(j);
export const getInvoice = (id: string): Promise<Invoice & { items: InvoiceItem[] }> => fetch(`${API.invoices}/${id}`).then(j);
export const getReceipt = (id: string): Promise<Receipt & { items: ReceiptItem[] }> => fetch(`${API.receipts}/${id}`).then(j);

// UPDATE
export const updateCustomer = (id: string, payload: Partial<Customer>): Promise<Customer> =>
  fetch(`${API.customers}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(j);
export const updateProduct = (id: string, payload: Partial<Product>): Promise<Product> =>
  fetch(`${API.products}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(j);
export const updateInvoice = (id: string, payload: Partial<Invoice>): Promise<Invoice> =>
  fetch(`${API.invoices}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(j);
export const updateReceipt = (id: string, payload: Partial<Receipt>): Promise<Receipt> =>
  fetch(`${API.receipts}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(j);
export const updateSettings = (payload: Partial<Settings>): Promise<Settings> =>
  fetch(API.settings, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(j);

// DELETE
export const deleteCustomer = (id: string): Promise<{ ok: true }> =>
  fetch(`${API.customers}/${id}`, { method: "DELETE" }).then(j);
export const deleteProduct = (id: string): Promise<{ ok: true }> =>
  fetch(`${API.products}/${id}`, { method: "DELETE" }).then(j);
export const deleteInvoice = (id: string): Promise<{ ok: true }> =>
  fetch(`${API.invoices}/${id}`, { method: "DELETE" }).then(j);
export const deleteReceipt = (id: string): Promise<{ ok: true }> =>
  fetch(`${API.receipts}/${id}`, { method: "DELETE" }).then(j);
