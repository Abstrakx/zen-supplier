use serde::{Deserialize, Serialize};
use tauri::State;
use super::DbState;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MarginItem {
    pub product_name: String,
    pub unit: String,
    pub quantity: f64,
    pub buy_price: f64,
    pub sell_price: f64,
    pub margin: f64,
    pub margin_percent: f64,
    pub total_profit: f64,
    pub order_date: String,
    pub kitchen_name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailySummary {
    pub order_date: String,
    pub total_items: i64,
    pub total_checked: i64,
    pub total_revenue: f64,
    pub total_cost: f64,
    pub total_profit: f64,
    pub kitchen_count: i64,
}

#[tauri::command]
pub fn get_margin_report(state: State<'_, DbState>, date_from: Option<String>, date_to: Option<String>) -> Result<Vec<MarginItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let query = match (&date_from, &date_to) {
        (Some(_), Some(_)) => {
            "SELECT oi.product_name, oi.unit, oi.quantity, COALESCE(oi.buy_price,0), COALESCE(oi.sell_price,0), do2.order_date, k.name
             FROM order_items oi
             JOIN daily_orders do2 ON oi.daily_order_id = do2.id
             LEFT JOIN kitchens k ON oi.kitchen_id = k.id
             WHERE do2.order_date >= ?1 AND do2.order_date <= ?2 AND oi.buy_price IS NOT NULL AND oi.sell_price IS NOT NULL
             ORDER BY do2.order_date DESC, oi.product_name"
        }
        _ => {
            "SELECT oi.product_name, oi.unit, oi.quantity, COALESCE(oi.buy_price,0), COALESCE(oi.sell_price,0), do2.order_date, k.name
             FROM order_items oi
             JOIN daily_orders do2 ON oi.daily_order_id = do2.id
             LEFT JOIN kitchens k ON oi.kitchen_id = k.id
             WHERE oi.buy_price IS NOT NULL AND oi.sell_price IS NOT NULL
             ORDER BY do2.order_date DESC, oi.product_name
             LIMIT 200"
        }
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let map_row = |row: &rusqlite::Row| -> rusqlite::Result<MarginItem> {
        let buy: f64 = row.get(3)?;
        let sell: f64 = row.get(4)?;
        let qty: f64 = row.get(2)?;
        let margin = sell - buy;
        let margin_pct = if buy > 0.0 { (margin / buy) * 100.0 } else { 0.0 };
        Ok(MarginItem {
            product_name: row.get(0)?,
            unit: row.get(1)?,
            quantity: qty,
            buy_price: buy,
            sell_price: sell,
            margin,
            margin_percent: margin_pct,
            total_profit: margin * qty,
            order_date: row.get(5)?,
            kitchen_name: row.get(6)?,
        })
    };

    let rows = match (&date_from, &date_to) {
        (Some(f), Some(t)) => stmt.query_map(rusqlite::params![f, t], map_row).map_err(|e| e.to_string())?,
        _ => stmt.query_map([], map_row).map_err(|e| e.to_string())?,
    };

    let mut items = Vec::new();
    for r in rows { if let Ok(i) = r { items.push(i); } }
    Ok(items)
}

#[tauri::command]
pub fn get_daily_summary(state: State<'_, DbState>) -> Result<Vec<DailySummary>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT do2.order_date,
                COUNT(oi.id),
                SUM(CASE WHEN oi.is_checked=1 THEN 1 ELSE 0 END),
                SUM(COALESCE(oi.sell_price,0) * oi.quantity),
                SUM(COALESCE(oi.buy_price,0) * oi.quantity),
                COUNT(DISTINCT oi.kitchen_id)
         FROM daily_orders do2
         LEFT JOIN order_items oi ON oi.daily_order_id = do2.id
         GROUP BY do2.order_date
         ORDER BY do2.order_date DESC
         LIMIT 30"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        let rev: f64 = row.get(3)?;
        let cost: f64 = row.get(4)?;
        Ok(DailySummary {
            order_date: row.get(0)?,
            total_items: row.get(1)?,
            total_checked: row.get(2)?,
            total_revenue: rev,
            total_cost: cost,
            total_profit: rev - cost,
            kitchen_count: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut summaries = Vec::new();
    for r in rows { if let Ok(s) = r { summaries.push(s); } }
    Ok(summaries)
}
