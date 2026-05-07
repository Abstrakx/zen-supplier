use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use super::DbState;

// ═══ STRUCTS ═══

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailyOrder {
    pub id: String,
    pub order_date: String,
    pub title: Option<String>,
    pub status: String,
    pub item_count: i64,
    pub checked_count: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
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
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailyOrderDetail {
    pub order: DailyOrder,
    pub items: Vec<OrderItem>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AggregateItem {
    pub product_name: String,
    pub unit: String,
    pub total_quantity: f64,
    pub category: String,
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
    pub title: Option<String>,
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

// ═══ COMMANDS ═══

#[tauri::command]
pub fn create_daily_order(state: State<'_, DbState>, payload: CreateDailyOrderPayload) -> Result<DailyOrder, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO daily_orders (id, order_date, title) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, payload.order_date, payload.title],
    )
    .map_err(|e| e.to_string())?;

    Ok(DailyOrder {
        id,
        order_date: payload.order_date,
        title: payload.title,
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
            title: row.get(2)?,
            status: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            item_count: row.get(6)?,
            checked_count: row.get(7)?,
        })
    };

    let orders = match (&date_from, &date_to) {
        (Some(from), Some(to)) => {
            let mut stmt = conn.prepare(
                "SELECT d.id, d.order_date, d.title, d.status, d.created_at, d.updated_at,
                        (SELECT COUNT(*) FROM order_items WHERE daily_order_id = d.id) as item_count,
                        (SELECT COUNT(*) FROM order_items WHERE daily_order_id = d.id AND is_checked = 1) as checked_count
                 FROM daily_orders d WHERE d.order_date >= ?1 AND d.order_date <= ?2 ORDER BY d.order_date DESC"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map(rusqlite::params![from, to], map_row).map_err(|e| e.to_string())?;
            let mut items = Vec::new();
            for r in rows { if let Ok(o) = r { items.push(o); } }
            items
        },
        _ => {
            let mut stmt = conn.prepare(
                "SELECT d.id, d.order_date, d.title, d.status, d.created_at, d.updated_at,
                        (SELECT COUNT(*) FROM order_items WHERE daily_order_id = d.id) as item_count,
                        (SELECT COUNT(*) FROM order_items WHERE daily_order_id = d.id AND is_checked = 1) as checked_count
                 FROM daily_orders d ORDER BY d.order_date DESC LIMIT 30"
            ).map_err(|e| e.to_string())?;
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

    // Get order header
    let order = conn.query_row(
        "SELECT d.id, d.order_date, d.title, d.status, d.created_at, d.updated_at,
                (SELECT COUNT(*) FROM order_items WHERE daily_order_id = d.id) as item_count,
                (SELECT COUNT(*) FROM order_items WHERE daily_order_id = d.id AND is_checked = 1) as checked_count
         FROM daily_orders d WHERE d.id = ?1",
        [&order_id],
        |row| {
            Ok(DailyOrder {
                id: row.get(0)?,
                order_date: row.get(1)?,
                title: row.get(2)?,
                status: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                item_count: row.get(6)?,
                checked_count: row.get(7)?,
            })
        },
    ).map_err(|e| e.to_string())?;

    // Get items with kitchen name
    let mut stmt = conn.prepare(
        "SELECT oi.id, oi.daily_order_id, oi.kitchen_id, k.name as kitchen_name,
                oi.product_id, oi.product_name, oi.quantity, oi.unit, oi.unit_id,
                oi.category, oi.supplier_id, oi.supplier_name, oi.is_checked,
                oi.notes, oi.buy_price, oi.sell_price
         FROM order_items oi
         LEFT JOIN kitchens k ON oi.kitchen_id = k.id
         WHERE oi.daily_order_id = ?1
         ORDER BY oi.supplier_name, oi.product_name"
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
        })
    }).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for r in item_rows {
        if let Ok(item) = r {
            items.push(item);
        }
    }

    Ok(DailyOrderDetail { order, items })
}

#[tauri::command]
pub fn add_order_item(state: State<'_, DbState>, payload: AddOrderItemPayload) -> Result<OrderItem, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO order_items (id, daily_order_id, kitchen_id, product_id, product_name, quantity, unit, unit_id, category, supplier_id, supplier_name, notes, buy_price, sell_price)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        rusqlite::params![
            id, payload.daily_order_id, payload.kitchen_id, payload.product_id,
            payload.product_name, payload.quantity, payload.unit, payload.unit_id,
            payload.category, payload.supplier_id, payload.supplier_name,
            payload.notes, payload.buy_price, payload.sell_price
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

#[tauri::command]
pub fn get_aggregate_shopping_list(state: State<'_, DbState>, order_id: String) -> Result<Vec<AggregateItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Get distinct products
    let mut stmt = conn.prepare(
        "SELECT DISTINCT product_name, unit, category FROM order_items WHERE daily_order_id = ?1 ORDER BY category, product_name"
    ).map_err(|e| e.to_string())?;

    let product_rows = stmt.query_map([&order_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
        ))
    }).map_err(|e| e.to_string())?;

    let mut aggregates: Vec<AggregateItem> = Vec::new();

    for pr in product_rows {
        if let Ok((pname, punit, pcat)) = pr {
            // Get distributions per kitchen
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
                distributions,
            });
        }
    }

    Ok(aggregates)
}
