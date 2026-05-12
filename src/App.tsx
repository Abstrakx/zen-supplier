import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { DailyOrderPage } from "./pages/DailyOrderPage";
import { DailyOrderDetailPage } from "./pages/DailyOrderDetailPage";
import { DeliveryNotePage } from "./pages/DeliveryNotePage";
import { InvoicePage } from "./pages/InvoicePage";
import { CatalogPage } from "./pages/CatalogPage";
import { ProductRegistrationPage } from "./pages/ProductRegistrationPage";
import { ReportPage } from "./pages/ReportPage";
import { SettingsPage } from "./pages/SettingsPage";
import type { NavPage } from "./types";
import "./index.css";

// Import Montserrat
import "@fontsource/montserrat/400.css"; // Normal
import "@fontsource/montserrat/700.css"; // Bold
import "@fontsource/montserrat/400-italic.css"; // Italic

// Import Plus Jakarta Sans
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { ProductDetailPage } from "./pages/ProductDetailPage";

export default function App() {
  const [activeNav, setActiveNav] = useState<NavPage>("dashboard");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderPage = () => {
    switch (activeNav) {
      case "dashboard":
        return <DashboardPage onNavigate={setActiveNav} />;
      case "catalog":
        return (
          <CatalogPage
            onNavigate={setActiveNav}
            onViewProduct={(id) => {
              setSelectedId(id);
              setActiveNav("product-detail");
            }}
          />
        );
      case "product-detail":
        return (
          <ProductDetailPage
            productId={selectedId || ""}
            onBack={() => setActiveNav("catalog")}
            onEditProduct={(p) => {
              setEditingProduct(p);
              setActiveNav("product-registration");
            }}
          />
        );
      case "daily-orders":
        return (
          <DailyOrderPage
            onOpenDetail={(id) => {
              setSelectedId(id);
              setActiveNav("daily-order-detail");
            }}
          />
        );
      case "daily-order-detail":
        return (
          <DailyOrderDetailPage
            orderId={selectedId || ""}
            onBack={() => setActiveNav("daily-orders")}
          />
        );
      case "delivery-notes":
        return <DeliveryNotePage />;
      case "invoices":
        return <InvoicePage />;
      case "product-registration":
        return (
          <ProductRegistrationPage
            onBack={() => {
              setEditingProduct(null);
              setActiveNav("catalog");
            }}
            editingProduct={editingProduct}
          />
        );
      case "reports":
        return <ReportPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={setActiveNav} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
      <Sidebar
        activeNav={activeNav}
        onNavigate={setActiveNav}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-hidden relative">{renderPage()}</main>
    </div>
  );
}
