// src/utils/api.ts  (zentralisierte Fetch-Wrapper, Endpunkte kannst du in deinem Backend mappen)
import { Appointment, Customer, Invoice, Order, Product, Quote, Receipt, Settings } from "./types";

const j = (r: Response) => { if(!r.ok) throw new Error(r.statusText); return r.json(); };

// Base‑URLs ggf. anpassen
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

export const getSettings = (): Promise<Settings> => fetch(API.settings).then(j);

export const getCustomers = (): Promise<Customer[]> => fetch(API.customers).then(j);
export const getProducts = (): Promise<Product[]> => fetch(API.products).then(j);
export const getInvoices = (): Promise<Invoice[]> => fetch(API.invoices).then(j);
export const getReceipts = (): Promise<Receipt[]> => fetch(API.receipts).then(j);
export const getQuotes = (): Promise<Quote[]> => fetch(API.quotes).then(j);
export const getOrders = (): Promise<Order[]> => fetch(API.orders).then(j);
export const getAppointments = (): Promise<Appointment[]> => fetch(API.appointments).then(j);

// Beispiel: Settings PATCH (Farben, Schrift, InfoStripe)
export const updateSettings = (payload: Partial<Settings>): Promise<Settings> =>
  fetch(API.settings, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) }).then(j);
