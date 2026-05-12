use super::DbState;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeliveryNote {
    pub id: String,
    pub daily_order_id: String,
    pub kitchen_id: String,
    pub kitchen_name: Option<String>,
    pub delivery_number: String,
    pub delivery_date: String,
    pub status: String,
    pub notes: Option<String>,
    pub item_count: i64,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeliveryNoteItem {
    pub id: String,
    pub product_name: String,
    pub quantity: f64,
    pub unit: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeliveryNoteDetail {
    pub note: DeliveryNote,
    pub items: Vec<DeliveryNoteItem>,
}

fn month_roman(m: u32) -> &'static str {
    match m {
        1 => "I",
        2 => "II",
        3 => "III",
        4 => "IV",
        5 => "V",
        6 => "VI",
        7 => "VII",
        8 => "VIII",
        9 => "IX",
        10 => "X",
        11 => "XI",
        12 => "XII",
        _ => "I",
    }
}

#[tauri::command]
pub fn generate_delivery_note(
    state: State<'_, DbState>,
    daily_order_id: String,
    kitchen_id: String,
    delivery_date: String,
) -> Result<DeliveryNote, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let kitchen_code: String = tx
        .query_row(
            "SELECT code FROM kitchens WHERE id=?1",
            [&kitchen_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("Kitchen not found: {}", e))?;
    let kitchen_name: String = tx
        .query_row(
            "SELECT name FROM kitchens WHERE id=?1",
            [&kitchen_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let po_number: String = tx
        .query_row(
            "SELECT po_number FROM daily_orders WHERE id = ?1",
            [&daily_order_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("PO not found: {}", e))?;

    let po_seq = po_number.split('/').next().unwrap_or("01");

    let parts: Vec<&str> = delivery_date.split('-').collect();
    let m = parts.get(1).unwrap_or(&"01").parse::<u32>().unwrap_or(1);
    let y = parts.first().unwrap_or(&"2026");
    let delivery_number = format!(
        "{}/ZS-{}/{}/{}",
        po_seq,
        kitchen_code,
        month_roman(m),
        y
    );
    let id = Uuid::new_v4().to_string();

    tx.execute("INSERT INTO delivery_notes (id,daily_order_id,kitchen_id,delivery_number,delivery_date) VALUES(?1,?2,?3,?4,?5)", rusqlite::params![id, daily_order_id, kitchen_id, delivery_number, delivery_date]).map_err(|e| e.to_string())?;

    // Collect items first to avoid borrow conflict with tx
    let fetched_items: Vec<(String, String, f64, String)> = {
        let mut stmt = tx.prepare(
            "SELECT oi.id, oi.product_name, oi.quantity, oi.unit 
             FROM order_items oi
             LEFT JOIN suppliers s ON oi.supplier_id = s.id
             WHERE oi.daily_order_id = ?1 AND oi.kitchen_id = ?2 AND (s.is_internal = 1 OR (oi.supplier_id IS NULL AND oi.category = 'internal'))"
        ).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![daily_order_id, kitchen_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, f64>(2)?,
                    r.get::<_, String>(3)?,
                ))
            })
            .map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    let mut ic: i64 = 0;
    for item in fetched_items {
        let (oid, pn, q, u) = item;
        let iid = Uuid::new_v4().to_string();
        tx.execute("INSERT INTO delivery_note_items (id,delivery_note_id,order_item_id,product_name,quantity,unit) VALUES(?1,?2,?3,?4,?5,?6)", rusqlite::params![iid, id, oid, pn, q, u]).map_err(|e| e.to_string())?;
        ic += 1;
    }
    tx.commit().map_err(|e| e.to_string())?;

    Ok(DeliveryNote {
        id,
        daily_order_id,
        kitchen_id,
        kitchen_name: Some(kitchen_name),
        delivery_number,
        delivery_date,
        status: "draft".into(),
        notes: None,
        item_count: ic,
        created_at: None,
    })
}

#[tauri::command]
pub fn get_delivery_notes(
    state: State<'_, DbState>,
    daily_order_id: Option<String>,
) -> Result<Vec<DeliveryNote>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let base = "SELECT dn.id,dn.daily_order_id,dn.kitchen_id,k.name,dn.delivery_number,dn.delivery_date,dn.status,dn.notes,dn.created_at,(SELECT COUNT(*) FROM delivery_note_items WHERE delivery_note_id=dn.id) FROM delivery_notes dn LEFT JOIN kitchens k ON dn.kitchen_id=k.id";
    let query = if daily_order_id.is_some() {
        format!(
            "{} WHERE dn.daily_order_id=?1 ORDER BY dn.delivery_date DESC",
            base
        )
    } else {
        format!("{} ORDER BY dn.delivery_date DESC LIMIT 50", base)
    };
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let map_row = |row: &rusqlite::Row| -> rusqlite::Result<DeliveryNote> {
        Ok(DeliveryNote {
            id: row.get(0)?,
            daily_order_id: row.get(1)?,
            kitchen_id: row.get(2)?,
            kitchen_name: row.get(3)?,
            delivery_number: row.get(4)?,
            delivery_date: row.get(5)?,
            status: row.get(6)?,
            notes: row.get(7)?,
            created_at: row.get(8)?,
            item_count: row.get(9)?,
        })
    };

    let rows = if let Some(oid) = &daily_order_id {
        stmt.query_map([oid], map_row).map_err(|e| e.to_string())?
    } else {
        stmt.query_map([], map_row).map_err(|e| e.to_string())?
    };
    let mut notes = Vec::new();
    for r in rows {
        if let Ok(n) = r {
            notes.push(n);
        }
    }
    Ok(notes)
}

#[tauri::command]
pub fn get_delivery_note_detail(
    state: State<'_, DbState>,
    note_id: String,
) -> Result<DeliveryNoteDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let note = conn.query_row(
        "SELECT dn.id,dn.daily_order_id,dn.kitchen_id,k.name,dn.delivery_number,dn.delivery_date,dn.status,dn.notes,dn.created_at,(SELECT COUNT(*) FROM delivery_note_items WHERE delivery_note_id=dn.id) FROM delivery_notes dn LEFT JOIN kitchens k ON dn.kitchen_id=k.id WHERE dn.id=?1",
        [&note_id], |row| Ok(DeliveryNote { id: row.get(0)?, daily_order_id: row.get(1)?, kitchen_id: row.get(2)?, kitchen_name: row.get(3)?, delivery_number: row.get(4)?, delivery_date: row.get(5)?, status: row.get(6)?, notes: row.get(7)?, created_at: row.get(8)?, item_count: row.get(9)? })
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id,product_name,quantity,unit FROM delivery_note_items WHERE delivery_note_id=?1 ORDER BY product_name").map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&note_id], |r| {
            Ok(DeliveryNoteItem {
                id: r.get(0)?,
                product_name: r.get(1)?,
                quantity: r.get(2)?,
                unit: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    for r in rows {
        if let Ok(i) = r {
            items.push(i);
        }
    }
    Ok(DeliveryNoteDetail { note, items })
}

#[tauri::command]
pub fn finalize_delivery_note(state: State<'_, DbState>, note_id: String) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Get SJ details
    let (daily_order_id, kitchen_id, delivery_date): (String, String, String) = tx
        .query_row(
            "SELECT daily_order_id, kitchen_id, delivery_date FROM delivery_notes WHERE id = ?1",
            [&note_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|e| e.to_string())?;

    // 2. Update SJ status
    tx.execute(
        "UPDATE delivery_notes SET status = 'done' WHERE id = ?1",
        [&note_id],
    )
    .map_err(|e| e.to_string())?;

    // 3. Update PO status
    tx.execute(
        "UPDATE daily_orders SET status = 'done' WHERE id = ?1",
        [&daily_order_id],
    )
    .map_err(|e| e.to_string())?;

    // 4. Generate Invoices (Split by Product Item Type: 'dapur' vs 'operasional')
    let po_number: String = tx
        .query_row(
            "SELECT po_number FROM daily_orders WHERE id = ?1",
            [&daily_order_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("PO not found: {}", e))?;
    let po_seq = po_number.split('/').next().unwrap_or("01");

    for inv_type in ["daily", "operational"] {
        let type_filter = if inv_type == "daily" { "dapur" } else { "operational" };
        
        // Check if any items exist for this type by joining with products
        let has_items: i64 = tx.query_row(
            "SELECT COUNT(*) FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.daily_order_id = ?1 AND oi.kitchen_id = ?2 
             AND COALESCE(p.item_type, 'dapur') = ?3",
            rusqlite::params![daily_order_id, kitchen_id, type_filter],
            |r| r.get(0)
        ).map_err(|e| e.to_string())?;

        if has_items > 0 {
            let (_kitchen_name, kitchen_code): (String, String) = tx.query_row(
                "SELECT name, code FROM kitchens WHERE id=?1", 
                [&kitchen_id], 
                |r| Ok((r.get(0)?, r.get(1)?))
            ).map_err(|e| e.to_string())?;

            let parts: Vec<&str> = delivery_date.split('-').collect();
            let m = parts.get(1).unwrap_or(&"01").parse::<u32>().unwrap_or(1);
            let y = parts.first().unwrap_or(&"2026");

            let month_roman = |m: u32| -> &'static str {
                match m {
                    1 => "I",
                    2 => "II",
                    3 => "III",
                    4 => "IV",
                    5 => "V",
                    6 => "VI",
                    7 => "VII",
                    8 => "VIII",
                    9 => "IX",
                    10 => "X",
                    11 => "XI",
                    12 => "XII",
                    _ => "I",
                }
            };

            let prefix = if inv_type == "daily" { "ZS" } else { "AGS" };
            let invoice_number = format!("{}/{}-{}/{}/{}", po_seq, prefix, kitchen_code, month_roman(m), y);
            let inv_id = Uuid::new_v4().to_string();

            tx.execute(
                "INSERT INTO invoices (id, daily_order_id, kitchen_id, invoice_number, invoice_type, invoice_date, status) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'draft')",
                rusqlite::params![inv_id, daily_order_id, kitchen_id, invoice_number, inv_type, delivery_date],
            ).map_err(|e| e.to_string())?;

            // Copy items to invoice
            let mut total = 0.0;
            {
                let mut stmt = tx.prepare(
                    "SELECT oi.product_name, oi.quantity, oi.unit, oi.buy_price, oi.sell_price, oi.id 
                     FROM order_items oi
                     LEFT JOIN products p ON oi.product_id = p.id
                     WHERE oi.daily_order_id = ?1 AND oi.kitchen_id = ?2 
                     AND COALESCE(p.item_type, 'dapur') = ?3"
                ).map_err(|e| e.to_string())?;

                let items = stmt
                    .query_map(rusqlite::params![daily_order_id, kitchen_id, type_filter], |r| {
                        Ok((
                            r.get::<_, String>(0)?,
                            r.get::<_, f64>(1)?,
                            r.get::<_, String>(2)?,
                            r.get::<_, Option<f64>>(3)?,
                            r.get::<_, Option<f64>>(4)?,
                            r.get::<_, String>(5)?,
                        ))
                    })
                    .map_err(|e| e.to_string())?;

                let day_names = [
                    "MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU",
                ];
                let day_name = chrono::NaiveDate::parse_from_str(&delivery_date, "%Y-%m-%d")
                    .ok()
                    .map(|d| {
                        use chrono::Datelike;
                        let wd = d.weekday().num_days_from_sunday();
                        day_names[wd as usize].to_string()
                    });

                for item in items {
                    if let Ok((pn, q, u, bp, sp, oid)) = item {
                        let sell = sp.unwrap_or(0.0);
                        let sub = q * sell;
                        total += sub;
                        let iid = Uuid::new_v4().to_string();
                        tx.execute(
                            "INSERT INTO invoice_items (id, invoice_id, order_item_id, product_name, day_name, item_date, quantity, unit, unit_price, buy_price, subtotal) 
                             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                            rusqlite::params![iid, inv_id, oid, pn, day_name, delivery_date, q, u, sell, bp, sub],
                        ).map_err(|e| e.to_string())?;
                    }
                }
            }
            tx.execute(
                "UPDATE invoices SET total_amount = ?1 WHERE id = ?2",
                rusqlite::params![total, inv_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}
