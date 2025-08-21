// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./theme/theme.css";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import InfoStripe from "./components/InfoStripe";
import { Page } from "./components/layout/Page";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/details/CustomerDetail";
import Products from "./pages/Products";
import ProductDetail from "./pages/details/ProductDetail";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/details/InvoiceDetail";
import Receipts from "./pages/Receipts";
import ReceiptDetail from "./pages/details/ReceiptDetail";
import Quotes from "./pages/Quotes";
import Orders from "./pages/Orders";
import Appointments from "./pages/Appointments";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Header />
        <InfoStripe />
        <Page>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/receipts/:id" element={<ReceiptDetail />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Page>
        <Footer />
      </BrowserRouter>
    </ThemeProvider>
  );
}
