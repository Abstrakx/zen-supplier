use rusqlite::{Connection, Result};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

pub fn init_db(app_handle: &tauri::AppHandle) -> Result<Connection> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
    }

    let db_path = app_dir.join("zen_supplier.db");
    let conn = Connection::open(db_path)?;

    // Enable WAL mode for better performance
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    // Create all tables
    conn.execute_batch(
        "
        -- ═══ MASTER DATA ═══

        -- Suppliers (with is_internal toggle)
        CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            is_internal INTEGER NOT NULL DEFAULT 1,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Kitchens / SPPG (dapur MBG)
        CREATE TABLE IF NOT EXISTS kitchens (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT NOT NULL UNIQUE,
            address TEXT,
            pic_name TEXT,
            pic_phone TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Products catalog (UUID-based, multi-unit)
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            base_unit TEXT NOT NULL,
            category TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Product units (one-to-many)
        CREATE TABLE IF NOT EXISTS product_units (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            unit_name TEXT NOT NULL,
            conversion_to_base REAL NOT NULL DEFAULT 1.0,
            is_base_unit INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );

        -- Price history (time-series, buy & sell)
        CREATE TABLE IF NOT EXISTS price_history (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            price_type TEXT NOT NULL,
            price REAL NOT NULL,
            unit_id TEXT,
            recorded_at TEXT DEFAULT (datetime('now')),
            notes TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY (unit_id) REFERENCES product_units(id)
        );

        -- ═══ PO & ORDER SYSTEM ═══

        -- Daily Order header (1 per hari)
        CREATE TABLE IF NOT EXISTS daily_orders (
            id TEXT PRIMARY KEY,
            order_date TEXT NOT NULL,
            title TEXT,
            status TEXT DEFAULT 'draft',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- Order items (per item per dapur)
        CREATE TABLE IF NOT EXISTS order_items (
            id TEXT PRIMARY KEY,
            daily_order_id TEXT NOT NULL,
            kitchen_id TEXT NOT NULL,
            product_id TEXT,
            product_name TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL,
            unit_id TEXT,
            category TEXT NOT NULL DEFAULT 'internal',
            supplier_id TEXT,
            supplier_name TEXT,
            is_checked INTEGER DEFAULT 0,
            notes TEXT,
            buy_price REAL,
            sell_price REAL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (daily_order_id) REFERENCES daily_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (kitchen_id) REFERENCES kitchens(id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );

        -- ═══ SURAT JALAN ═══

        CREATE TABLE IF NOT EXISTS delivery_notes (
            id TEXT PRIMARY KEY,
            daily_order_id TEXT NOT NULL,
            kitchen_id TEXT NOT NULL,
            delivery_number TEXT NOT NULL,
            delivery_date TEXT NOT NULL,
            status TEXT DEFAULT 'draft',
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (daily_order_id) REFERENCES daily_orders(id),
            FOREIGN KEY (kitchen_id) REFERENCES kitchens(id)
        );

        CREATE TABLE IF NOT EXISTS delivery_note_items (
            id TEXT PRIMARY KEY,
            delivery_note_id TEXT NOT NULL,
            order_item_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL,
            FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE CASCADE,
            FOREIGN KEY (order_item_id) REFERENCES order_items(id)
        );

        -- ═══ INVOICE ═══

        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            daily_order_id TEXT NOT NULL,
            kitchen_id TEXT NOT NULL,
            invoice_number TEXT NOT NULL,
            invoice_type TEXT NOT NULL,
            invoice_date TEXT NOT NULL,
            total_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'draft',
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (daily_order_id) REFERENCES daily_orders(id),
            FOREIGN KEY (kitchen_id) REFERENCES kitchens(id)
        );

        CREATE TABLE IF NOT EXISTS invoice_items (
            id TEXT PRIMARY KEY,
            invoice_id TEXT NOT NULL,
            order_item_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            day_name TEXT,
            item_date TEXT,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL,
            unit_price REAL NOT NULL,
            buy_price REAL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
            FOREIGN KEY (order_item_id) REFERENCES order_items(id)
        );
        ",
    )?;

    Ok(conn)
}
