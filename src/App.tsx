import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import InfoStripe from "./components/InfoStripe";
import Page from "./components/layout/Page";

import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Invoices from "./pages/Invoices";
import Receipts from "./pages/Receipts";
import Appointments from "./pages/Appointments"; // <— WICHTIG
import SettingsPage from "./pages/Settings";

export default function App() {
  return (
    <div className="app-shell">
      <BrowserRouter>
        <Header />
        <main className="main">
          <div className="container">
            <InfoStripe />
            <Page>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/products" element={<Products />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/receipts" element={<Receipts />} />
                <Route path="/appointments" element={<Appointments />} /> {/* <— HIER */}
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Page>
          </div>
        </main>
        <Footer />
      </BrowserRouter>
    </div>
  );
}
