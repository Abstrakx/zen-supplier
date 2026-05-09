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
            supplier_id TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
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

        -- Daily Order header (1 per hari per dapur)
        CREATE TABLE IF NOT EXISTS daily_orders (
            id TEXT PRIMARY KEY,
            order_date TEXT NOT NULL,
            kitchen_id TEXT,
            po_number TEXT,
            title TEXT,
            status TEXT DEFAULT 'draft',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (kitchen_id) REFERENCES kitchens(id)
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
            po_section_id TEXT,
            is_new_product INTEGER DEFAULT 0,
            FOREIGN KEY (daily_order_id) REFERENCES daily_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (kitchen_id) REFERENCES kitchens(id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
            FOREIGN KEY (po_section_id) REFERENCES po_sections(id)
        );

        -- PO Sections (sub-POs: Harian, Rapelan, etc.)
        CREATE TABLE IF NOT EXISTS po_sections (
            id TEXT PRIMARY KEY,
            daily_order_id TEXT NOT NULL,
            section_name TEXT NOT NULL DEFAULT 'Harian',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (daily_order_id) REFERENCES daily_orders(id) ON DELETE CASCADE
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
    
    // ═══ MIGRATIONS ═══
    // Simple migration to add missing columns to existing tables
    let _ = conn.execute("ALTER TABLE suppliers ADD COLUMN phone TEXT", []);
    let _ = conn.execute("ALTER TABLE suppliers ADD COLUMN address TEXT", []);
    let _ = conn.execute("ALTER TABLE products ADD COLUMN supplier_id TEXT", []);
    let _ = conn.execute("ALTER TABLE products ADD COLUMN item_type TEXT DEFAULT 'dapur'", []);
    let _ = conn.execute("ALTER TABLE daily_orders ADD COLUMN kitchen_id TEXT", []);
    let _ = conn.execute("ALTER TABLE daily_orders ADD COLUMN po_number TEXT", []);
    let _ = conn.execute("ALTER TABLE order_items ADD COLUMN po_section_id TEXT", []);
    let _ = conn.execute("ALTER TABLE order_items ADD COLUMN is_new_product INTEGER DEFAULT 0", []);
    // Create po_sections table if not exists (for existing DBs)
    let _ = conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS po_sections (
            id TEXT PRIMARY KEY,
            daily_order_id TEXT NOT NULL,
            section_name TEXT NOT NULL DEFAULT 'Harian',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (daily_order_id) REFERENCES daily_orders(id) ON DELETE CASCADE
        );"
    );

    Ok(conn)
}

#[tauri::command]
pub fn reset_database(state: tauri::State<'_, crate::commands::DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Disable foreign keys temporarily to drop everything
    let _ = conn.execute("PRAGMA foreign_keys = OFF", []);

    let tables = [
        "invoice_items", "invoices",
        "delivery_note_items", "delivery_notes",
        "order_items", "daily_orders",
        "price_history", "product_units", "products",
        "kitchens", "suppliers"
    ];

    for table in tables {
        let _ = conn.execute(&format!("DROP TABLE IF EXISTS {}", table), []);
    }

    let _ = conn.execute("PRAGMA foreign_keys = ON", []);

    Ok(())
}
