use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use super::DbState;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Invoice {
    pub id: String,
    pub daily_order_id: String,
    pub kitchen_id: String,
    pub kitchen_name: Option<String>,
    pub kitchen_address: Option<String>,
    pub kitchen_pic_name: Option<String>,
    pub kitchen_pic_phone: Option<String>,
    pub invoice_number: String,
    pub invoice_type: String,
    pub invoice_date: String,
    pub total_amount: f64,
    pub status: String,
    pub notes: Option<String>,
    pub item_count: i64,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InvoiceItem {
    pub id: String,
    pub product_name: String,
    pub day_name: Option<String>,
    pub item_date: Option<String>,
    pub quantity: f64,
    pub unit: String,
    pub unit_price: f64,
    pub buy_price: Option<f64>,
    pub subtotal: f64,
    pub has_margin_warning: bool,
    pub product_id: Option<String>,
    pub unit_id: Option<String>,
    pub is_manual: i32,
    pub original_price: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InvoiceDetail {
    pub invoice: Invoice,
    pub items: Vec<InvoiceItem>,
}

fn month_roman(m: u32) -> &'static str {
    match m { 1=>"I",2=>"II",3=>"III",4=>"IV",5=>"V",6=>"VI",7=>"VII",8=>"VIII",9=>"IX",10=>"X",11=>"XI",12=>"XII",_=>"I" }
}

#[tauri::command]
pub fn generate_invoice(state: State<'_, DbState>, daily_order_id: String, kitchen_id: String, invoice_type: String, invoice_date: String) -> Result<Invoice, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (kitchen_name, kitchen_code, kitchen_address, kitchen_pic_name, kitchen_pic_phone): (String, String, Option<String>, Option<String>, Option<String>) = tx.query_row(
        "SELECT name, code, address, pic_name, pic_phone FROM kitchens WHERE id=?1", 
        [&kitchen_id], 
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))
    ).map_err(|e| e.to_string())?;

    let po_number: String = tx
        .query_row(
            "SELECT po_number FROM daily_orders WHERE id = ?1",
            [&daily_order_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("PO not found: {}", e))?;
    let po_seq = po_number.split('/').next().unwrap_or("01");

    let parts: Vec<&str> = invoice_date.split('-').collect();
    let m = parts.get(1).unwrap_or(&"01").parse::<u32>().unwrap_or(1);
    let y = parts.first().unwrap_or(&"2026");
    let prefix = if invoice_type == "daily" { "ZS" } else { "AGS" };
    let invoice_number = format!("{}/{}-{}/{}/{}", po_seq, prefix, kitchen_code, month_roman(m), y);
    let id = Uuid::new_v4().to_string();

    // Filter based on product item_type ('dapur' vs 'operasional')
    let type_filter = if invoice_type == "daily" { "dapur" } else { "operational" };
    let query = format!(
        "SELECT oi.id, oi.product_name, oi.quantity, oi.unit, oi.buy_price, oi.sell_price 
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.daily_order_id = ?1 AND oi.kitchen_id = ?2 
         AND COALESCE(p.item_type, 'dapur') = '{}'",
        type_filter
    );

    tx.execute("INSERT INTO invoices (id,daily_order_id,kitchen_id,invoice_number,invoice_type,invoice_date) VALUES(?1,?2,?3,?4,?5,?6)", rusqlite::params![id, daily_order_id, kitchen_id, invoice_number, invoice_type, invoice_date]).map_err(|e| e.to_string())?;

    let fetched_items: Vec<(String,String,f64,String,Option<f64>,Option<f64>)> = {
        let mut stmt = tx.prepare(&query).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(rusqlite::params![daily_order_id, kitchen_id], |r| {
            Ok((r.get::<_,String>(0)?, r.get::<_,String>(1)?, r.get::<_,f64>(2)?, r.get::<_,String>(3)?, r.get::<_,Option<f64>>(4)?, r.get::<_,Option<f64>>(5)?))
        }).map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    let mut total = 0.0;
    let mut ic: i64 = 0;
    let day_names = ["MINGGU","SENIN","SELASA","RABU","KAMIS","JUMAT","SABTU"];
    let day_name = chrono::NaiveDate::parse_from_str(&invoice_date, "%Y-%m-%d").ok().map(|d| {
        use chrono::Datelike;
        let wd = d.weekday().num_days_from_sunday();
        day_names[wd as usize].to_string()
    });

    for item in fetched_items {
        let (oid, pn, q, u, bp, sp) = item;
        let sell = sp.unwrap_or(0.0);
        let sub = q * sell;
        total += sub;
        let iid = Uuid::new_v4().to_string();
        tx.execute("INSERT INTO invoice_items (id,invoice_id,order_item_id,product_name,day_name,item_date,quantity,unit,unit_price,buy_price,subtotal,is_manual,original_price) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
            rusqlite::params![iid, id, oid, pn, day_name, invoice_date, q, u, sell, bp, sub, 0, sell]).map_err(|e| e.to_string())?;
        ic += 1;
    }

    tx.execute("UPDATE invoices SET total_amount=?1 WHERE id=?2", rusqlite::params![total, id]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(Invoice { 
        id, 
        daily_order_id, 
        kitchen_id, 
        kitchen_name: Some(kitchen_name), 
        kitchen_address,
        kitchen_pic_name,
        kitchen_pic_phone,
        invoice_number, 
        invoice_type, 
        invoice_date, 
        total_amount: total, 
        status: "draft".into(), 
        notes: None, 
        item_count: ic, 
        created_at: None 
    })
}

#[tauri::command]
pub fn get_invoices(state: State<'_, DbState>, daily_order_id: Option<String>) -> Result<Vec<Invoice>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let base = "SELECT i.id,i.daily_order_id,i.kitchen_id,k.name,i.invoice_number,i.invoice_type,i.invoice_date,i.total_amount,i.status,i.notes,i.created_at,(SELECT COUNT(*) FROM invoice_items WHERE invoice_id=i.id),k.address,k.pic_name,k.pic_phone FROM invoices i LEFT JOIN kitchens k ON i.kitchen_id=k.id";
    let query = if daily_order_id.is_some() { format!("{} WHERE i.daily_order_id=?1 ORDER BY i.created_at DESC", base) } else { format!("{} ORDER BY i.created_at DESC LIMIT 50", base) };
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let map_row = |row: &rusqlite::Row| -> rusqlite::Result<Invoice> {
        Ok(Invoice { id: row.get(0)?, daily_order_id: row.get(1)?, kitchen_id: row.get(2)?, kitchen_name: row.get(3)?, invoice_number: row.get(4)?, invoice_type: row.get(5)?, invoice_date: row.get(6)?, total_amount: row.get(7)?, status: row.get(8)?, notes: row.get(9)?, created_at: row.get(10)?, item_count: row.get(11)?, kitchen_address: row.get(12)?, kitchen_pic_name: row.get(13)?, kitchen_pic_phone: row.get(14)? })
    };
    let rows = if let Some(oid) = &daily_order_id { stmt.query_map([oid], map_row).map_err(|e| e.to_string())? } else { stmt.query_map([], map_row).map_err(|e| e.to_string())? };
    let mut invoices = Vec::new();
    for r in rows { if let Ok(i) = r { invoices.push(i); } }
    Ok(invoices)
}

#[tauri::command]
pub fn get_invoice_detail(state: State<'_, DbState>, invoice_id: String) -> Result<InvoiceDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let invoice = conn.query_row(
        "SELECT i.id,i.daily_order_id,i.kitchen_id,k.name,i.invoice_number,i.invoice_type,i.invoice_date,i.total_amount,i.status,i.notes,i.created_at,(SELECT COUNT(*) FROM invoice_items WHERE invoice_id=i.id),k.address,k.pic_name,k.pic_phone FROM invoices i LEFT JOIN kitchens k ON i.kitchen_id=k.id WHERE i.id=?1",
        [&invoice_id], |row| Ok(Invoice { id: row.get(0)?, daily_order_id: row.get(1)?, kitchen_id: row.get(2)?, kitchen_name: row.get(3)?, invoice_number: row.get(4)?, invoice_type: row.get(5)?, invoice_date: row.get(6)?, total_amount: row.get(7)?, status: row.get(8)?, notes: row.get(9)?, created_at: row.get(10)?, item_count: row.get(11)?, kitchen_address: row.get(12)?, kitchen_pic_name: row.get(13)?, kitchen_pic_phone: row.get(14)? })
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id,product_name,day_name,item_date,quantity,unit,unit_price,buy_price,subtotal,product_id,unit_id,is_manual,original_price FROM invoice_items WHERE invoice_id=?1 ORDER BY product_name").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([&invoice_id], |r| {
        let up: f64 = r.get(6)?;
        let bp: Option<f64> = r.get(7)?;
        let warn = bp.map(|b| up < b).unwrap_or(false);
        Ok(InvoiceItem { id: r.get(0)?, product_name: r.get(1)?, day_name: r.get(2)?, item_date: r.get(3)?, quantity: r.get(4)?, unit: r.get(5)?, unit_price: up, buy_price: bp, subtotal: r.get(8)?, has_margin_warning: warn, product_id: r.get(9)?, unit_id: r.get(10)?, is_manual: r.get(11).unwrap_or(0), original_price: r.get::<_, Option<f64>>(12)?.unwrap_or(up) })
    }).map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    for r in rows { if let Ok(i) = r { items.push(i); } }
    Ok(InvoiceDetail { invoice, items })
}

#[tauri::command]
pub fn finalize_invoice(state: State<'_, DbState>, invoice_id: String) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let price_updates: Vec<(f64, String, Option<String>)> = {
        let mut stmt = tx.prepare("
            SELECT ii.unit_price, oi.product_id, 
                   (SELECT id FROM product_units WHERE product_id = oi.product_id AND is_base_unit = 1 LIMIT 1) as unit_id
            FROM invoice_items ii 
            JOIN order_items oi ON ii.order_item_id = oi.id 
            WHERE ii.invoice_id = ?1 AND oi.product_id IS NOT NULL
            
            UNION ALL
            
            SELECT ii.unit_price, ii.product_id, ii.unit_id
            FROM invoice_items ii
            WHERE ii.invoice_id = ?1 AND ii.order_item_id IS NULL AND ii.product_id IS NOT NULL
        ").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([&invoice_id], |r| Ok((r.get::<_,f64>(0)?, r.get::<_,String>(1)?, r.get::<_,Option<String>>(2)?))).map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    for item in price_updates {
        let (sell_price, product_id, unit_id) = item;
        if sell_price > 0.0 {
            let pid = Uuid::new_v4().to_string();
            tx.execute("INSERT INTO price_history (id,product_id,price_type,price,unit_id,notes) VALUES(?1,?2,'sell',?3,?4,'Updated from invoice finalization')",
                rusqlite::params![pid, product_id, sell_price, unit_id]).map_err(|e| e.to_string())?;
        }
    }

    tx.execute("UPDATE invoices SET status='finalized' WHERE id=?1", rusqlite::params![invoice_id]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_invoice_item(state: State<'_, DbState>, item_id: String, quantity: f64, unit_price: f64, buy_price: Option<f64>) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let subtotal = quantity * unit_price;
    tx.execute(
        "UPDATE invoice_items SET quantity = ?1, unit_price = ?2, subtotal = ?3, buy_price = ?4 WHERE id = ?5",
        rusqlite::params![quantity, unit_price, subtotal, buy_price, item_id],
    ).map_err(|e| e.to_string())?;

    // Update total amount of the invoice
    let invoice_id: String = tx.query_row(
        "SELECT invoice_id FROM invoice_items WHERE id = ?1",
        [&item_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let total: f64 = tx.query_row(
        "SELECT SUM(subtotal) FROM invoice_items WHERE invoice_id = ?1",
        [&invoice_id],
        |r| r.get(0),
    ).unwrap_or(0.0);

    tx.execute("UPDATE invoices SET total_amount = ?1 WHERE id = ?2", rusqlite::params![total, invoice_id]).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_invoice_item(state: State<'_, DbState>, item_id: String) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let invoice_id: String = tx.query_row(
        "SELECT invoice_id FROM invoice_items WHERE id = ?1",
        [&item_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM invoice_items WHERE id = ?1", [&item_id]).map_err(|e| e.to_string())?;

    let total: f64 = tx.query_row(
        "SELECT SUM(subtotal) FROM invoice_items WHERE invoice_id = ?1",
        [&invoice_id],
        |r| r.get(0),
    ).unwrap_or(0.0);

    tx.execute("UPDATE invoices SET total_amount = ?1 WHERE id = ?2", rusqlite::params![total, invoice_id]).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn add_manual_invoice_item(state: State<'_, DbState>, invoice_id: String, product_name: String, quantity: f64, unit: String, unit_price: f64, product_id: Option<String>, unit_id: Option<String>) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let subtotal = quantity * unit_price;
    
    let (invoice_date,): (String,) = tx.query_row(
        "SELECT invoice_date FROM invoices WHERE id = ?1",
        [&invoice_id],
        |r| Ok((r.get(0)?,)),
    ).map_err(|e| e.to_string())?;

    let day_names = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
    let day_name = chrono::NaiveDate::parse_from_str(&invoice_date, "%Y-%m-%d").ok().map(|d| {
        use chrono::Datelike;
        day_names[d.weekday().num_days_from_sunday() as usize].to_string()
    });

    let buy_price: Option<f64> = if let Some(uid) = &unit_id {
        tx.query_row(
            "SELECT price FROM price_history WHERE unit_id = ?1 AND price_type = 'buy' ORDER BY recorded_at DESC LIMIT 1",
            [uid],
            |r| r.get(0)
        ).ok()
    } else if let Some(pid) = &product_id {
        tx.query_row(
            "SELECT price FROM price_history WHERE product_id = ?1 AND price_type = 'buy' ORDER BY recorded_at DESC LIMIT 1",
            [pid],
            |r| r.get(0)
        ).ok()
    } else {
        None
    };

    tx.execute(
        "INSERT INTO invoice_items (id, invoice_id, product_name, quantity, unit, unit_price, buy_price, subtotal, product_id, unit_id, day_name, item_date, is_manual, original_price) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        rusqlite::params![id, invoice_id, product_name, quantity, unit, unit_price, buy_price, subtotal, product_id, unit_id, day_name, invoice_date, 1, unit_price],
    ).map_err(|e| e.to_string())?;

    let total: f64 = tx.query_row(
        "SELECT SUM(subtotal) FROM invoice_items WHERE invoice_id = ?1",
        [&invoice_id],
        |r| r.get(0),
    ).unwrap_or(0.0);

    tx.execute("UPDATE invoices SET total_amount = ?1 WHERE id = ?2", rusqlite::params![total, invoice_id]).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}
