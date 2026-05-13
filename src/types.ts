// ═══ MASTER DATA ═══

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  is_internal: boolean;
  is_active: boolean;
  created_at: string | null;
}

export interface Kitchen {
  id: string;
  code: string;
  name: string;
  address: string | null;
  pic_name: string | null;
  pic_phone: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface ProductUnit {
  id: string;
  unit_name: string;
  conversion_to_base: number;
  is_base_unit: boolean;
  latest_buy_price: number | null;
  latest_sell_price: number | null;
}

export interface PriceRecord {
  id: string;
  price_type: 'buy' | 'sell';
  price: number;
  unit_id: string | null;
  recorded_at: string | null;
  notes: string | null;
}

export interface Product {
  id: string;
  name: string;
  neto?: string | null;
  base_unit: string;
  category: string | null;
  supplier_id: string | null;
  item_type: string | null;
  is_active: boolean;
  units: ProductUnit[];
  latest_buy_price: number | null;
  latest_sell_price: number | null;
  created_at: string | null;
}

// ═══ PO / ORDER ═══

export interface DailyOrder {
  id: string;
  order_date: string;
  kitchen_id: string | null;
  kitchen_name: string | null;
  po_number: string | null;
  title: string | null;
  status: string;
  item_count: number;
  checked_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PoSection {
  id: string;
  daily_order_id: string;
  section_name: string;
  sort_order: number;
}

export type ItemCategory = 'internal' | 'external' | 'operational';

export interface OrderItem {
  id: string;
  daily_order_id: string;
  kitchen_id: string;
  kitchen_name: string | null;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_id: string | null;
  category: ItemCategory;
  supplier_id: string | null;
  supplier_name: string | null;
  is_checked: boolean;
  notes: string | null;
  buy_price: number | null;
  sell_price: number | null;
  po_section_id: string | null;
  is_new_product: boolean;
}

export interface DailyOrderDetail {
  order: DailyOrder;
  sections: PoSection[];
  items: OrderItem[];
}

export interface KitchenDistribution {
  kitchen_id: string;
  kitchen_name: string;
  quantity: number;
}

export interface AggregateItem {
  product_name: string;
  unit: string;
  total_quantity: number;
  category: string;
  is_external: boolean;
  distributions: KitchenDistribution[];
}

// ═══ SURAT JALAN ═══

export interface DeliveryNote {
  id: string;
  daily_order_id: string;
  kitchen_id: string;
  kitchen_name: string | null;
  delivery_number: string;
  delivery_date: string;
  status: string;
  notes: string | null;
  item_count: number;
  created_at: string | null;
}

export interface DeliveryNoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
}

export interface DeliveryNoteDetail {
  note: DeliveryNote;
  items: DeliveryNoteItem[];
}

// ═══ INVOICE ═══

export interface Invoice {
  id: string;
  daily_order_id: string;
  kitchen_id: string;
  kitchen_name: string | null;
  invoice_number: string;
  invoice_type: 'daily' | 'operational' | 'rapelan';
  invoice_date: string;
  total_amount: number;
  status: string;
  notes: string | null;
  item_count: number;
  created_at: string | null;
}

export interface InvoiceItem {
  id: string;
  product_name: string;
  day_name: string | null;
  item_date: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  buy_price: number | null;
  subtotal: number;
  has_margin_warning: boolean;
}

export interface InvoiceDetail {
  invoice: Invoice;
  items: InvoiceItem[];
}

// ═══ REPORTS ═══

export interface MarginItem {
  product_name: string;
  unit: string;
  quantity: number;
  buy_price: number;
  sell_price: number;
  margin: number;
  margin_percent: number;
  total_profit: number;
  order_date: string;
  kitchen_name: string | null;
}

export interface DailySummary {
  order_date: string;
  total_items: number;
  total_checked: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  kitchen_count: number;
}

export interface InvoiceReportItem {
  product_name: string;
  unit: string;
  jenis: string | null;
  quantity: number;
  harga: number;
  jual: number;
  keuntungan_per_pcs: number;
  total_invoice: number;
  total_modal: number;
  keuntungan_per_bahan: number;
}

export interface InvoiceReport {
  daily_order_id: string;
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  kitchen_name: string;
  kitchen_id: string;
  invoice_type: string;
  status: string;
  grand_total_invoice: number;
  grand_total_modal: number;
  grand_total_keuntungan: number;
  items: InvoiceReportItem[];
}

// ═══ NAV ═══

export type NavPage =
  | 'dashboard'
  | 'daily-orders'
  | 'daily-order-detail'
  | 'delivery-notes'
  | 'invoices'
  | 'catalog'
  | 'product-detail'
  | 'product-registration'
  | 'reports'
  | 'settings'
  | 'koneksi';

export interface UnitConversionPayload {
  custom_unit_name: string;
  conversion_rate: number | null;
  is_nominal: boolean;
}

export interface AddProductPayload {
  name: string;
  base_unit: string;
  category: string | null;
  supplier_id: string | null;
  units: { 
    unit_name: string; 
    conversion_to_base: number; 
    is_base_unit: boolean;
    buy_price: number | null;
    sell_price: number | null;
  }[];
  buy_price: number | null;
  sell_price: number | null;
}
