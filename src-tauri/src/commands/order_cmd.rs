use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use super::DbState;

// ═══ STRUCTS ═══

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailyOrder {
    pub id: String,
    pub order_date: String,
    pub kitchen_id: Option<String>,
    pub kitchen_name: Option<String>,
    pub po_number: Option<String>,
    pub title: Option<String>,
    pub status: String,
    pub item_count: i64,
    pub checked_count: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PoSection {
    pub id: String,
    pub daily_order_id: String,
    pub section_name: String,
    pub sort_order: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OrderItem {
    pub id: String,
    pub daily_order_id: String,
    pub kitchen_id: String,
    pub kitchen_name: Option<String>,
    pub product_id: Option<String>,
    pub product_name: String,
    pub quantity: f64,
    pub unit: String,
    pub unit_id: Option<String>,
    pub category: String,
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub is_checked: bool,
    pub notes: Option<String>,
    pub buy_price: Option<f64>,
    pub sell_price: Option<f64>,
    pub po_section_id: Option<String>,
    pub is_new_product: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailyOrderDetail {
    pub order: DailyOrder,
    pub sections: Vec<PoSection>,
    pub items: Vec<OrderItem>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AggregateItem {
    pub product_name: String,
    pub unit: String,
    pub total_quantity: f64,
    pub category: String,
    pub is_external: bool,
    pub distributions: Vec<KitchenDistribution>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KitchenDistribution {
    pub kitchen_id: String,
    pub kitchen_name: String,
    pub quantity: f64,
}

#[derive(Deserialize, Debug)]
pub struct CreateDailyOrderPayload {
    pub order_date: String,
    pub kitchen_id: String,
    pub custom_seq: Option<i64>,
}

#[derive(Deserialize, Debug)]
pub struct AddOrderItemPayload {
    pub daily_order_id: String,
    pub kitchen_id: String,
    pub product_id: Option<String>,
    pub product_name: String,
    pub quantity: f64,
    pub unit: String,
    pub unit_id: Option<String>,
    pub category: String,
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub notes: Option<String>,
    pub buy_price: Option<f64>,
    pub sell_price: Option<f64>,
    pub po_section_id: Option<String>,
    pub is_new_product: Option<bool>,
}

#[derive(Deserialize, Debug)]
pub struct UpdateOrderItemPayload {
    pub id: String,
    pub product_name: String,
    pub quantity: f64,
    pub unit: String,
    pub category: String,
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub notes: Option<String>,
    pub buy_price: Option<f64>,
    pub sell_price: Option<f64>,
}

#[derive(Deserialize, Debug)]
pub struct CreatePoSectionPayload {
    pub daily_order_id: String,
    pub section_name: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct UpdatePoSectionPayload {
    pub id: String,
    pub section_name: String,
}

// ═══ HELPERS ═══

fn month_to_roman(month: u32) -> &'static str {
    match month {
        1 => "I", 2 => "II", 3 => "III", 4 => "IV",
        5 => "V", 6 => "VI", 7 => "VII", 8 => "VIII",
        9 => "IX", 10 => "X", 11 => "XI", 12 => "XII",
        _ => "I",
    }
}

fn generate_po_number(conn: &rusqlite::Connection, order_date: &str, kitchen_code: &str, custom_seq: Option<i64>) -> Result<String, String> {
    // Parse year and month from order_date (YYYY-MM-DD)
    let parts: Vec<&str> = order_date.split('-').collect();
    if parts.len() < 2 {
        return Err("Invalid date format".to_string());
    }
    let year = parts[0];
    let month: u32 = parts[1].parse().unwrap_or(1);
    let year_month = format!("{}-{:02}", year, month);

    let seq = match custom_seq {
        Some(s) => s,
        None => {
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM daily_orders WHERE strftime('%Y-%m', order_date) = ?1",
                    [&year_month],
                    |row| row.get(0),
                )
                .unwrap_or(0);
            count + 1
        }
    };

    let roman = month_to_roman(month);

    Ok(format!("{:02}/ZS-{}/{}/{}", seq, kitchen_code, roman, year))
}

#[tauri::command]
pub fn get_next_po_sequence(state: State<'_, DbState>, order_date: String) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let parts: Vec<&str> = order_date.split('-').collect();
    if parts.len() < 2 {
        return Err("Invalid date format".to_string());
    }
    let year = parts[0];
    let month: u32 = parts[1].parse().unwrap_or(1);
    let year_month = format!("{}-{:02}", year, month);

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM daily_orders WHERE strftime('%Y-%m', order_date) = ?1",
            [&year_month],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(count + 1)
}

// ═══ COMMANDS ═══

#[tauri::command]
pub fn create_daily_order(state: State<'_, DbState>, payload: CreateDailyOrderPayload) -> Result<DailyOrder, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    // Look up kitchen info
    let (kitchen_name, kitchen_code): (String, String) = conn
        .query_row(
            "SELECT name, code FROM kitchens WHERE id = ?1",
            [&payload.kitchen_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Kitchen not found: {}", e))?;

    // Generate PO number
    let po_number = generate_po_number(&conn, &payload.order_date, &kitchen_code, payload.custom_seq)?;

    // Auto-generate title: "PO MBG KITCHEN_NAME / DATE"
    let title = format!("PO MBG {} / {}", kitchen_name, payload.order_date);

    conn.execute(
        "INSERT INTO daily_orders (id, order_date, kitchen_id, po_number, title) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, payload.order_date, payload.kitchen_id, po_number, title],
    )
    .map_err(|e| e.to_string())?;

    // Create default "Harian" section
    let section_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO po_sections (id, daily_order_id, section_name, sort_order) VALUES (?1, ?2, 'Harian', 0)",
        rusqlite::params![section_id, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(DailyOrder {
        id,
        order_date: payload.order_date,
        kitchen_id: Some(payload.kitchen_id),
        kitchen_name: Some(kitchen_name),
        po_number: Some(po_number),
        title: Some(title),
        status: "draft".to_string(),
        item_count: 0,
        checked_count: 0,
        created_at: None,
        updated_at: None,
    })
}

#[tauri::command]
pub fn get_daily_orders(state: State<'_, DbState>, date_from: Option<String>, date_to: Option<String>) -> Result<Vec<DailyOrder>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let map_row = |row: &rusqlite::Row| -> rusqlite::Result<DailyOrder> {
        Ok(DailyOrder {
            id: row.get(0)?,
            order_date: row.get(1)?,
            kitchen_id: row.get(2)?,
            po_number: row.get(3)?,
            title: row.get(4)?,
            status: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            item_count: row.get(8)?,
            checked_count: row.get(9)?,
            kitchen_name: row.get(10)?,
        })
    };

    let base_query = "SELECT d.id, d.order_date, d.kitchen_id, d.po_number, d.title, d.status, d.created_at, d.updated_at,
                      (SELECT COUNT(*) FROM order_items WHERE daily_order_id = d.id) as item_count,
                      (SELECT COUNT(*) FROM order_items WHERE daily_order_id = d.id AND is_checked = 1) as checked_count,
                      k.name as kitchen_name
                      FROM daily_orders d
                      LEFT JOIN kitchens k ON d.kitchen_id = k.id";

    let orders = match (&date_from, &date_to) {
        (Some(from), Some(to)) => {
            let sql = format!("{} WHERE d.order_date >= ?1 AND d.order_date <= ?2 ORDER BY CASE WHEN d.status = 'done' THEN 1 ELSE 0 END, d.created_at DESC", base_query);
            let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
            let rows = stmt.query_map(rusqlite::params![from, to], map_row).map_err(|e| e.to_string())?;
            let mut items = Vec::new();
            for r in rows { if let Ok(o) = r { items.push(o); } }
            items
        },
        _ => {
            let sql = format!("{} ORDER BY CASE WHEN d.status = 'done' THEN 1 ELSE 0 END, d.created_at DESC LIMIT 50", base_query);
            let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], map_row).map_err(|e| e.to_string())?;
            let mut items = Vec::new();
            for r in rows { if let Ok(o) = r { items.push(o); } }
            items
        }
    };
    
    Ok(orders)
}

#[tauri::command]
pub fn get_daily_order_detail(state: State<'_, DbState>, order_id: String) -> Result<DailyOrderDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Get order header with kitchen name
    let order = conn.query_row(
        "SELECT d.id, d.order_date, d.kitchen_id, d.po_number, d.title, d.status, d.created_at, d.updated_at,
                (SELECT COUNT(*) FROM order_items WHERE daily_order_id = d.id) as item_count,
                (SELECT COUNT(*) FROM order_items WHERE daily_order_id = d.id AND is_checked = 1) as checked_count,
                k.name as kitchen_name
         FROM daily_orders d
         LEFT JOIN kitchens k ON d.kitchen_id = k.id
         WHERE d.id = ?1",
        [&order_id],
        |row| {
            Ok(DailyOrder {
                id: row.get(0)?,
                order_date: row.get(1)?,
                kitchen_id: row.get(2)?,
                po_number: row.get(3)?,
                title: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                item_count: row.get(8)?,
                checked_count: row.get(9)?,
                kitchen_name: row.get(10)?,
            })
        },
    ).map_err(|e| e.to_string())?;

    // Get sections
    let mut sec_stmt = conn.prepare(
        "SELECT id, daily_order_id, section_name, sort_order FROM po_sections WHERE daily_order_id = ?1 ORDER BY sort_order"
    ).map_err(|e| e.to_string())?;

    let sec_rows = sec_stmt.query_map([&order_id], |row| {
        Ok(PoSection {
            id: row.get(0)?,
            daily_order_id: row.get(1)?,
            section_name: row.get(2)?,
            sort_order: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut sections = Vec::new();
    for r in sec_rows {
        if let Ok(s) = r { sections.push(s); }
    }

    // Get items with kitchen name
    let mut stmt = conn.prepare(
        "SELECT oi.id, oi.daily_order_id, oi.kitchen_id, k.name as kitchen_name,
                oi.product_id, oi.product_name, oi.quantity, oi.unit, oi.unit_id,
                oi.category, oi.supplier_id, COALESCE(oi.supplier_name, s.name) as supplier_name, 
                oi.is_checked, oi.notes, oi.buy_price, oi.sell_price, oi.po_section_id,
                COALESCE(oi.is_new_product, 0) as is_new_product
         FROM order_items oi
         LEFT JOIN kitchens k ON oi.kitchen_id = k.id
         LEFT JOIN suppliers s ON oi.supplier_id = s.id
         WHERE oi.daily_order_id = ?1
         ORDER BY oi.po_section_id, oi.product_name"
    ).map_err(|e| e.to_string())?;

    let item_rows = stmt.query_map([&order_id], |row| {
        Ok(OrderItem {
            id: row.get(0)?,
            daily_order_id: row.get(1)?,
            kitchen_id: row.get(2)?,
            kitchen_name: row.get(3)?,
            product_id: row.get(4)?,
            product_name: row.get(5)?,
            quantity: row.get(6)?,
            unit: row.get(7)?,
            unit_id: row.get(8)?,
            category: row.get(9)?,
            supplier_id: row.get(10)?,
            supplier_name: row.get(11)?,
            is_checked: row.get::<_, i32>(12)? != 0,
            notes: row.get(13)?,
            buy_price: row.get(14)?,
            sell_price: row.get(15)?,
            po_section_id: row.get(16)?,
            is_new_product: row.get::<_, i32>(17)? != 0,
        })
    }).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for r in item_rows {
        if let Ok(item) = r {
            items.push(item);
        }
    }

    Ok(DailyOrderDetail { order, sections, items })
}

#[tauri::command]
pub fn add_order_item(state: State<'_, DbState>, payload: AddOrderItemPayload) -> Result<OrderItem, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let is_new = payload.is_new_product.unwrap_or(false);

    conn.execute(
        "INSERT INTO order_items (id, daily_order_id, kitchen_id, product_id, product_name, quantity, unit, unit_id, category, supplier_id, supplier_name, notes, buy_price, sell_price, po_section_id, is_new_product)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        rusqlite::params![
            id, payload.daily_order_id, payload.kitchen_id, payload.product_id,
            payload.product_name, payload.quantity, payload.unit, payload.unit_id,
            payload.category, payload.supplier_id, payload.supplier_name,
            payload.notes, payload.buy_price, payload.sell_price,
            payload.po_section_id, is_new as i32
        ],
    )
    .map_err(|e| e.to_string())?;

    // Update daily_order updated_at
    conn.execute(
        "UPDATE daily_orders SET updated_at = datetime('now') WHERE id = ?1",
        rusqlite::params![payload.daily_order_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(OrderItem {
        id,
        daily_order_id: payload.daily_order_id,
        kitchen_id: payload.kitchen_id,
        kitchen_name: None,
        product_id: payload.product_id,
        product_name: payload.product_name,
        quantity: payload.quantity,
        unit: payload.unit,
        unit_id: payload.unit_id,
        category: payload.category,
        supplier_id: payload.supplier_id,
        supplier_name: payload.supplier_name,
        is_checked: false,
        notes: payload.notes,
        buy_price: payload.buy_price,
        sell_price: payload.sell_price,
        po_section_id: payload.po_section_id,
        is_new_product: is_new,
    })
}

#[tauri::command]
pub fn update_order_item(state: State<'_, DbState>, payload: UpdateOrderItemPayload) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE order_items SET product_name = ?1, quantity = ?2, unit = ?3, category = ?4,
         supplier_id = ?5, supplier_name = ?6, notes = ?7, buy_price = ?8, sell_price = ?9,
         updated_at = datetime('now') WHERE id = ?10",
        rusqlite::params![
            payload.product_name, payload.quantity, payload.unit, payload.category,
            payload.supplier_id, payload.supplier_name, payload.notes,
            payload.buy_price, payload.sell_price, payload.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_order_item(state: State<'_, DbState>, item_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM order_items WHERE id = ?1", rusqlite::params![item_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toggle_item_checklist(state: State<'_, DbState>, item_id: String) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current: i32 = conn
        .query_row("SELECT is_checked FROM order_items WHERE id = ?1", [&item_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let new_val = if current == 0 { 1 } else { 0 };
    conn.execute("UPDATE order_items SET is_checked = ?1 WHERE id = ?2", rusqlite::params![new_val, item_id])
        .map_err(|e| e.to_string())?;
    Ok(new_val != 0)
}

// ═══ PO SECTION COMMANDS ═══

#[tauri::command]
pub fn create_po_section(state: State<'_, DbState>, payload: CreatePoSectionPayload) -> Result<PoSection, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    // Get next sort_order
    let max_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM po_sections WHERE daily_order_id = ?1",
            [&payload.daily_order_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let section_name = payload.section_name.unwrap_or_else(|| {
        let rapelan_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM po_sections WHERE daily_order_id = ?1 AND (section_name = 'Rapelan' OR section_name LIKE 'Rapelan (%)')",
                [&payload.daily_order_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if rapelan_count == 0 {
            "Rapelan".to_string()
        } else {
            format!("Rapelan ({})", rapelan_count)
        }
    });

    conn.execute(
        "INSERT INTO po_sections (id, daily_order_id, section_name, sort_order) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, payload.daily_order_id, section_name, max_order + 1],
    )
    .map_err(|e| e.to_string())?;

    Ok(PoSection {
        id,
        daily_order_id: payload.daily_order_id,
        section_name,
        sort_order: max_order + 1,
    })
}

#[tauri::command]
pub fn update_po_section(state: State<'_, DbState>, payload: UpdatePoSectionPayload) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE po_sections SET section_name = ?1 WHERE id = ?2",
        rusqlite::params![payload.section_name, payload.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_po_section(state: State<'_, DbState>, section_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // Delete items in this section first
    conn.execute("DELETE FROM order_items WHERE po_section_id = ?1", rusqlite::params![section_id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM po_sections WHERE id = ?1", rusqlite::params![section_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ═══ WORKFLOW COMMANDS ═══

#[tauri::command]
pub fn forward_po_to_delivery(state: State<'_, DbState>, order_id: String) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Get PO details
    let (order_date, kitchen_id, kitchen_code, po_number): (String, String, String, String) = tx.query_row(
        "SELECT d.order_date, d.kitchen_id, k.code, d.po_number 
         FROM daily_orders d 
         JOIN kitchens k ON d.kitchen_id = k.id 
         WHERE d.id = ?1",
        [&order_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get::<_, Option<String>>(3)?.unwrap_or_default())),
    ).map_err(|e| e.to_string())?;

    // 2. Update PO status to 'ordered'
    tx.execute(
        "UPDATE daily_orders SET status = 'ordered', updated_at = datetime('now') WHERE id = ?1",
        rusqlite::params![order_id],
    )
    .map_err(|e| e.to_string())?;

    // 3. Generate Delivery Note (SJ)
    let po_seq = po_number.split('/').next().unwrap_or("01");
    
    // Helper for Roman months
    let month_roman = |m: u32| -> &'static str {
        match m { 1=>"I",2=>"II",3=>"III",4=>"IV",5=>"V",6=>"VI",7=>"VII",8=>"VIII",9=>"IX",10=>"X",11=>"XI",12=>"XII",_=>"I" }
    };

    let parts: Vec<&str> = order_date.split('-').collect();
    let m = parts.get(1).unwrap_or(&"01").parse::<u32>().unwrap_or(1);
    let y = parts.first().unwrap_or(&"2026");
    let delivery_number = format!("{}/ZS-{}/{}/{}", po_seq, kitchen_code, month_roman(m), y);
    
    let sj_id = Uuid::new_v4().to_string();

    tx.execute(
        "INSERT INTO delivery_notes (id, daily_order_id, kitchen_id, delivery_number, delivery_date, status) 
         VALUES (?1, ?2, ?3, ?4, ?5, 'draft')",
        rusqlite::params![sj_id, order_id, kitchen_id, delivery_number, order_date],
    ).map_err(|e| e.to_string())?;

    // 4. Copy items to delivery_note_items (Only Internal Suppliers)
    {
        let mut stmt = tx.prepare(
            "SELECT oi.id, oi.product_name, oi.quantity, oi.unit 
             FROM order_items oi
             LEFT JOIN suppliers s ON oi.supplier_id = s.id
             WHERE oi.daily_order_id = ?1 AND (s.is_internal = 1 OR (oi.supplier_id IS NULL AND oi.category = 'internal'))"
        ).map_err(|e| e.to_string())?;

        let items = stmt.query_map([&order_id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(2)?, r.get::<_, String>(3)?))
        }).map_err(|e| e.to_string())?;

        for item in items {
            if let Ok((oid, pn, q, u)) = item {
                let iid = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO delivery_note_items (id, delivery_note_id, order_item_id, product_name, quantity, unit) 
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    rusqlite::params![iid, sj_id, oid, pn, q, u],
                ).map_err(|e| e.to_string())?;
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_po_status(state: State<'_, DbState>, order_id: String, status: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE daily_orders SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
        rusqlite::params![status, order_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_aggregate_shopping_list(state: State<'_, DbState>, order_id: String) -> Result<Vec<AggregateItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Get distinct products
    let mut stmt = conn.prepare(
        "SELECT oi.product_name, oi.unit, oi.category, 
                MAX(CASE WHEN s.is_internal = 0 THEN 1 ELSE 0 END) as is_external
         FROM order_items oi
         LEFT JOIN suppliers s ON oi.supplier_id = s.id
         WHERE oi.daily_order_id = ?1 
         GROUP BY oi.product_name, oi.unit, oi.category
         ORDER BY oi.category, oi.product_name"
    ).map_err(|e| e.to_string())?;

    let product_rows = stmt.query_map([&order_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, i32>(3)? == 1,
        ))
    }).map_err(|e| e.to_string())?;

    let mut aggregates: Vec<AggregateItem> = Vec::new();

    for pr in product_rows {
        if let Ok((pname, punit, pcat, is_ext)) = pr {
            let mut dist_stmt = conn.prepare(
                "SELECT oi.kitchen_id, k.name, SUM(oi.quantity)
                 FROM order_items oi
                 LEFT JOIN kitchens k ON oi.kitchen_id = k.id
                 WHERE oi.daily_order_id = ?1 AND oi.product_name = ?2 AND oi.unit = ?3
                 GROUP BY oi.kitchen_id"
            ).map_err(|e| e.to_string())?;

            let dist_rows = dist_stmt.query_map(rusqlite::params![&order_id, &pname, &punit], |row| {
                Ok(KitchenDistribution {
                    kitchen_id: row.get(0)?,
                    kitchen_name: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                    quantity: row.get(2)?,
                })
            }).map_err(|e| e.to_string())?;

            let mut distributions = Vec::new();
            let mut total = 0.0;
            for d in dist_rows {
                if let Ok(dist) = d {
                    total += dist.quantity;
                    distributions.push(dist);
                }
            }

            aggregates.push(AggregateItem {
                product_name: pname,
                unit: punit,
                total_quantity: total,
                category: pcat,
                is_external: is_ext,
                distributions,
            });
        }
    }

    Ok(aggregates)
}

#[tauri::command]
pub fn get_aggregate_by_date(state: State<'_, DbState>, order_date: String) -> Result<Vec<AggregateItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // 1. Get distinct products for that date across all POs
    // Join with suppliers to determine if ANY of the products for this date are from an external supplier
    let mut stmt = conn.prepare(
        "SELECT oi.product_name, oi.unit, oi.category, 
                MAX(CASE WHEN s.is_internal = 0 THEN 1 ELSE 0 END) as is_external
         FROM order_items oi
         JOIN daily_orders do ON oi.daily_order_id = do.id
         LEFT JOIN suppliers s ON oi.supplier_id = s.id
         WHERE do.order_date = ?1 
         GROUP BY oi.product_name, oi.unit, oi.category
         ORDER BY oi.category, oi.product_name"
    ).map_err(|e| e.to_string())?;

    let product_rows = stmt.query_map([&order_date], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, i32>(3)? == 1, // is_external
        ))
    }).map_err(|e| e.to_string())?;

    let mut aggregates: Vec<AggregateItem> = Vec::new();

    for pr in product_rows {
        if let Ok((pname, punit, pcat, is_ext)) = pr {
            // 2. For each product, get distributions per kitchen
            let mut dist_stmt = conn.prepare(
                "SELECT oi.kitchen_id, k.name, SUM(oi.quantity)
                 FROM order_items oi
                 JOIN daily_orders do ON oi.daily_order_id = do.id
                 LEFT JOIN kitchens k ON oi.kitchen_id = k.id
                 WHERE do.order_date = ?1 AND oi.product_name = ?2 AND oi.unit = ?3
                 GROUP BY oi.kitchen_id"
            ).map_err(|e| e.to_string())?;

            let dist_rows = dist_stmt.query_map(rusqlite::params![&order_date, &pname, &punit], |row| {
                Ok(KitchenDistribution {
                    kitchen_id: row.get(0)?,
                    kitchen_name: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                    quantity: row.get(2)?,
                })
            }).map_err(|e| e.to_string())?;

            let mut distributions = Vec::new();
            let mut total = 0.0;
            for d in dist_rows {
                if let Ok(dist) = d {
                    total += dist.quantity;
                    distributions.push(dist);
                }
            }

            aggregates.push(AggregateItem {
                product_name: pname,
                unit: punit,
                total_quantity: total,
                category: pcat,
                is_external: is_ext,
                distributions,
            });
        }
    }

    Ok(aggregates)
}

#[tauri::command]
pub fn delete_daily_order(state: State<'_, DbState>, order_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM daily_orders WHERE id = ?1",
        rusqlite::params![order_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn sync_po_to_delivery(state: State<'_, DbState>, order_id: String) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Get the SJ id (whether draft or done)
    let sj_id: String = tx.query_row(
        "SELECT id FROM delivery_notes WHERE daily_order_id = ?1 LIMIT 1",
        [&order_id],
        |r| r.get(0),
    ).map_err(|_| "Tidak ditemukan Surat Jalan untuk PO ini.")?;

    // 2. Delete old items
    tx.execute("DELETE FROM delivery_note_items WHERE delivery_note_id = ?1", [&sj_id]).map_err(|e| e.to_string())?;

    // 3. Re-copy items (Only Internal Suppliers)
    {
        let mut stmt = tx.prepare(
            "SELECT oi.id, oi.product_name, oi.quantity, oi.unit 
             FROM order_items oi
             LEFT JOIN suppliers s ON oi.supplier_id = s.id
             WHERE oi.daily_order_id = ?1 AND (s.is_internal = 1 OR (oi.supplier_id IS NULL AND oi.category = 'internal'))"
        ).map_err(|e| e.to_string())?;

        let items = stmt.query_map([&order_id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(2)?, r.get::<_, String>(3)?))
        }).map_err(|e| e.to_string())?;

        for item in items {
            if let Ok((oid, pn, q, u)) = item {
                let iid = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO delivery_note_items (id, delivery_note_id, order_item_id, product_name, quantity, unit) 
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    rusqlite::params![iid, sj_id, oid, pn, q, u],
                ).map_err(|e| e.to_string())?;
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}
