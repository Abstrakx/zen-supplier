use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use super::DbState;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NotaBreakdown {
    pub id: String,
    pub nota_number: String,
    pub purchase_date: String,
    pub store_id: Option<String>,
    pub store_name: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub section_count: i64,
    pub item_count: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NotaSection {
    pub id: String,
    pub nota_id: String,
    pub dapur_id: Option<String>,
    pub dapur_name: Option<String>,
    pub section_label: String,
    pub sort_order: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NotaItem {
    pub id: String,
    pub nota_id: String,
    pub section_id: Option<String>,
    pub product_name: String,
    pub quantity: f64,
    pub unit: String,
    pub buy_price: Option<f64>,
    pub subtotal: Option<f64>,
    pub notes: Option<String>,
    pub product_id: Option<String>,
    pub unit_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NotaBreakdownDetail {
    pub nota: NotaBreakdown,
    pub sections: Vec<NotaSection>,
    pub items: Vec<NotaItem>,
}

#[derive(Deserialize, Debug)]
pub struct CreateNotaPayload {
    pub nota_number: String,
    pub purchase_date: String,
    pub store_id: Option<String>,
    pub store_name: Option<String>,
    pub notes: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct UpdateNotaPayload {
    pub nota_number: String,
    pub purchase_date: String,
    pub store_id: Option<String>,
    pub store_name: Option<String>,
    pub notes: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct CreateSectionPayload {
    pub nota_id: String,
    pub dapur_id: Option<String>,
    pub dapur_name: Option<String>,
    pub section_label: String,
}

#[derive(Deserialize, Debug)]
pub struct CreateItemPayload {
    pub nota_id: String,
    pub section_id: Option<String>,
    pub product_name: String,
    pub quantity: f64,
    pub unit: String,
    pub buy_price: Option<f64>,
    pub subtotal: Option<f64>,
    pub notes: Option<String>,
    pub product_id: Option<String>,
    pub unit_id: Option<String>,
}

#[tauri::command]
pub fn get_nota_breakdowns(state: State<'_, DbState>) -> Result<Vec<NotaBreakdown>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("
            SELECT n.id, n.nota_number, n.purchase_date, n.store_id, n.store_name, n.status, n.notes, n.created_at,
                   (SELECT COUNT(*) FROM nota_sections WHERE nota_id = n.id) as section_count,
                   (SELECT COUNT(*) FROM nota_items WHERE nota_id = n.id) as item_count
            FROM nota_breakdown n
            ORDER BY n.purchase_date DESC, n.created_at DESC
        ")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([], |row| {
            Ok(NotaBreakdown {
                id: row.get(0)?,
                nota_number: row.get(1)?,
                purchase_date: row.get(2)?,
                store_id: row.get(3)?,
                store_name: row.get(4)?,
                status: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
                section_count: row.get(8)?,
                item_count: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(n) = r {
            list.push(n);
        }
    }
    Ok(list)
}

#[tauri::command]
pub fn get_nota_breakdown_detail(state: State<'_, DbState>, nota_id: String) -> Result<NotaBreakdownDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let nota = conn.query_row("
        SELECT id, nota_number, purchase_date, store_id, store_name, status, notes, created_at,
               (SELECT COUNT(*) FROM nota_sections WHERE nota_id = id) as section_count,
               (SELECT COUNT(*) FROM nota_items WHERE nota_id = id) as item_count
        FROM nota_breakdown WHERE id = ?1", 
        [&nota_id],
        |row| {
            Ok(NotaBreakdown {
                id: row.get(0)?,
                nota_number: row.get(1)?,
                purchase_date: row.get(2)?,
                store_id: row.get(3)?,
                store_name: row.get(4)?,
                status: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
                section_count: row.get(8)?,
                item_count: row.get(9)?,
            })
        }
    ).map_err(|e| e.to_string())?;

    let mut section_stmt = conn.prepare("SELECT id, nota_id, dapur_id, dapur_name, section_label, sort_order FROM nota_sections WHERE nota_id = ?1 ORDER BY sort_order")
        .map_err(|e| e.to_string())?;
    let section_rows = section_stmt.query_map([&nota_id], |row| {
        Ok(NotaSection {
            id: row.get(0)?,
            nota_id: row.get(1)?,
            dapur_id: row.get(2)?,
            dapur_name: row.get(3)?,
            section_label: row.get(4)?,
            sort_order: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut sections = Vec::new();
    for r in section_rows {
        if let Ok(s) = r {
            sections.push(s);
        }
    }

    let mut item_stmt = conn.prepare("SELECT id, nota_id, section_id, product_name, quantity, unit, buy_price, subtotal, notes, product_id, unit_id FROM nota_items WHERE nota_id = ?1")
        .map_err(|e| e.to_string())?;
    let item_rows = item_stmt.query_map([&nota_id], |row| {
        Ok(NotaItem {
            id: row.get(0)?,
            nota_id: row.get(1)?,
            section_id: row.get(2)?,
            product_name: row.get(3)?,
            quantity: row.get(4)?,
            unit: row.get(5)?,
            buy_price: row.get(6)?,
            subtotal: row.get(7)?,
            notes: row.get(8)?,
            product_id: row.get(9)?,
            unit_id: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for r in item_rows {
        if let Ok(i) = r {
            items.push(i);
        }
    }

    Ok(NotaBreakdownDetail { nota, sections, items })
}

#[tauri::command]
pub fn create_nota_breakdown(state: State<'_, DbState>, payload: CreateNotaPayload) -> Result<NotaBreakdown, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO nota_breakdown (id, nota_number, purchase_date, store_id, store_name, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, payload.nota_number, payload.purchase_date, payload.store_id, payload.store_name, payload.notes],
    )
    .map_err(|e| e.to_string())?;

    Ok(NotaBreakdown {
        id,
        nota_number: payload.nota_number,
        purchase_date: payload.purchase_date,
        store_id: payload.store_id,
        store_name: payload.store_name,
        status: "draft".to_string(),
        notes: payload.notes,
        created_at: None,
        section_count: 0,
        item_count: 0,
    })
}

#[tauri::command]
pub fn update_nota_breakdown(state: State<'_, DbState>, nota_id: String, payload: UpdateNotaPayload) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE nota_breakdown SET nota_number = ?1, purchase_date = ?2, store_id = ?3, store_name = ?4, notes = ?5 WHERE id = ?6",
        rusqlite::params![payload.nota_number, payload.purchase_date, payload.store_id, payload.store_name, payload.notes, nota_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_nota_breakdown(state: State<'_, DbState>, nota_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM nota_breakdown WHERE id = ?1", [&nota_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn add_nota_section(state: State<'_, DbState>, payload: CreateSectionPayload) -> Result<NotaSection, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    
    let max_sort: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), 0) FROM nota_sections WHERE nota_id = ?1",
        [&payload.nota_id],
        |row| row.get(0)
    ).unwrap_or(0);

    conn.execute(
        "INSERT INTO nota_sections (id, nota_id, dapur_id, dapur_name, section_label, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, payload.nota_id, payload.dapur_id, payload.dapur_name, payload.section_label, max_sort + 1],
    ).map_err(|e| e.to_string())?;

    Ok(NotaSection {
        id,
        nota_id: payload.nota_id,
        dapur_id: payload.dapur_id,
        dapur_name: payload.dapur_name,
        section_label: payload.section_label,
        sort_order: max_sort + 1,
    })
}

#[tauri::command]
pub fn update_nota_section(state: State<'_, DbState>, id: String, payload: CreateSectionPayload) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE nota_sections SET dapur_id = ?1, dapur_name = ?2, section_label = ?3 WHERE id = ?4",
        rusqlite::params![payload.dapur_id, payload.dapur_name, payload.section_label, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_nota_section(state: State<'_, DbState>, section_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM nota_sections WHERE id = ?1", [&section_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn add_nota_item(state: State<'_, DbState>, payload: CreateItemPayload) -> Result<NotaItem, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    
    let subtotal = payload.buy_price.unwrap_or(0.0) * payload.quantity;

    conn.execute(
        "INSERT INTO nota_items (id, nota_id, section_id, product_name, quantity, unit, buy_price, subtotal, notes, product_id, unit_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![id, payload.nota_id, payload.section_id, payload.product_name, payload.quantity, payload.unit, payload.buy_price, subtotal, payload.notes, payload.product_id, payload.unit_id],
    ).map_err(|e| e.to_string())?;

    Ok(NotaItem {
        id,
        nota_id: payload.nota_id,
        section_id: payload.section_id,
        product_name: payload.product_name,
        quantity: payload.quantity,
        unit: payload.unit,
        buy_price: payload.buy_price,
        subtotal: Some(subtotal),
        notes: payload.notes,
        product_id: payload.product_id,
        unit_id: payload.unit_id,
    })
}

#[tauri::command]
pub fn update_nota_item(state: State<'_, DbState>, item_id: String, payload: CreateItemPayload) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let subtotal = payload.buy_price.unwrap_or(0.0) * payload.quantity;

    conn.execute(
        "UPDATE nota_items SET product_name = ?1, quantity = ?2, unit = ?3, buy_price = ?4, subtotal = ?5, notes = ?6, product_id = ?7, unit_id = ?8 WHERE id = ?9",
        rusqlite::params![payload.product_name, payload.quantity, payload.unit, payload.buy_price, subtotal, payload.notes, payload.product_id, payload.unit_id, item_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_nota_item(state: State<'_, DbState>, item_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM nota_items WHERE id = ?1", [&item_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn finalize_nota(state: State<'_, DbState>, nota_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE nota_breakdown SET status = 'done' WHERE id = ?1", [&nota_id]).map_err(|e| e.to_string())?;
    Ok(())
}
