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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InvoiceReportItem {
    pub product_name: String,
    pub unit: String,
    pub jenis: Option<String>,
    pub quantity: f64,
    pub harga: f64,                    // modal (buy_price)
    pub jual: f64,                     // selling price (unit_price)
    pub keuntungan_per_pcs: f64,       // sell - buy
    pub total_invoice: f64,            // sell * qty
    pub total_modal: f64,              // buy * qty
    pub keuntungan_per_bahan: f64,     // profit per row
    pub is_manual: i32,
    pub original_price: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InvoiceReport {
    pub daily_order_id: String,
    pub invoice_id: String,
    pub invoice_number: String,
    pub invoice_date: String,
    pub kitchen_name: String,
    pub kitchen_id: String,
    pub invoice_type: String,
    pub status: String,
    pub grand_total_invoice: f64,
    pub grand_total_modal: f64,
    pub grand_total_keuntungan: f64,
    pub items: Vec<InvoiceReportItem>,
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

#[tauri::command]
pub fn get_invoice_report(
    state: State<'_, DbState>,
    kitchen_id: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<InvoiceReport>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut query = "
        SELECT i.daily_order_id, i.id, i.invoice_number, i.invoice_date, k.name, i.kitchen_id, i.invoice_type, i.status, i.total_amount
        FROM invoices i
        JOIN kitchens k ON i.kitchen_id = k.id
        WHERE 1=1".to_string();

    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    if let Some(kid) = &kitchen_id {
        query.push_str(" AND i.kitchen_id = ?");
        params.push(Box::new(kid.clone()));
    }
    if let Some(df) = &date_from {
        query.push_str(" AND i.invoice_date >= ?");
        params.push(Box::new(df.clone()));
    }
    if let Some(dt) = &date_to {
        query.push_str(" AND i.invoice_date <= ?");
        params.push(Box::new(dt.clone()));
    }
    query.push_str(" ORDER BY i.invoice_date DESC, i.invoice_number DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    // Create a vector to store the parameters as &dyn ToSql
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let invoice_rows = stmt.query_map(&param_refs[..], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
            row.get::<_, String>(7)?,
            row.get::<_, f64>(8)?,
        ))
    }).map_err(|e| e.to_string())?;

    let mut reports = Vec::new();
    for inv in invoice_rows {
        if let Ok((doid, id, num, date, kname, kid, itype, status, total_inv)) = inv {
            // Fetch items for this invoice
            let mut item_stmt = conn.prepare("
                SELECT 
                    ii.product_name, 
                    ii.unit, 
                    p.item_type, 
                    ii.quantity, 
                    COALESCE(ii.buy_price, 0.0), 
                    ii.unit_price,
                    ii.subtotal,
                    ii.is_manual,
                    ii.original_price
                FROM invoice_items ii
                LEFT JOIN order_items oi ON ii.order_item_id = oi.id
                LEFT JOIN products p ON (oi.product_id = p.id OR ii.product_id = p.id)
                WHERE ii.invoice_id = ?
            ").map_err(|e| e.to_string())?;

            let item_rows = item_stmt.query_map([&id], |row| {
                let qty: f64 = row.get(3)?;
                let buy: f64 = row.get(4)?;
                let sell: f64 = row.get(5)?;
                let total_item_inv: f64 = row.get(6)?;
                let total_item_modal = qty * buy;
                
                Ok(InvoiceReportItem {
                    product_name: row.get(0)?,
                    unit: row.get(1)?,
                    jenis: row.get(2)?,
                    quantity: qty,
                    harga: buy,
                    jual: sell,
                    keuntungan_per_pcs: sell - buy,
                    total_invoice: total_item_inv,
                    total_modal: total_item_modal,
                    keuntungan_per_bahan: total_item_inv - total_item_modal,
                    is_manual: row.get::<_, Option<i32>>(7)?.unwrap_or(0),
                    original_price: row.get::<_, Option<f64>>(8)?.unwrap_or(sell),
                })
            }).map_err(|e| e.to_string())?;

            let mut items = Vec::new();
            let mut grand_modal = 0.0;
            for item in item_rows {
                if let Ok(i) = item {
                    grand_modal += i.total_modal;
                    items.push(i);
                }
            }

            reports.push(InvoiceReport {
                daily_order_id: doid,
                invoice_id: id,
                invoice_number: num,
                invoice_date: date,
                kitchen_name: kname,
                kitchen_id: kid,
                invoice_type: itype,
                status,
                grand_total_invoice: total_inv,
                grand_total_modal: grand_modal,
                grand_total_keuntungan: total_inv - grand_modal,
                items,
            });
        }
    }

    Ok(reports)
}
