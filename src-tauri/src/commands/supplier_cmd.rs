use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use super::DbState;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Supplier {
    pub id: String,
    pub code: String,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub is_internal: bool,
    pub is_active: bool,
    pub created_at: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct CreateSupplierPayload {
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub is_internal: bool,
}

#[derive(Deserialize, Debug)]
pub struct UpdateSupplierPayload {
    pub id: String,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub is_internal: bool,
    pub is_active: bool,
}

#[tauri::command]
pub fn get_suppliers(state: State<'_, DbState>) -> Result<Vec<Supplier>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, code, name, phone, address, is_internal, is_active, created_at FROM suppliers ORDER BY name")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Supplier {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                phone: row.get(3)?,
                address: row.get(4)?,
                is_internal: row.get::<_, i32>(5)? != 0,
                is_active: row.get::<_, i32>(6)? != 0,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut suppliers = Vec::new();
    for row in rows {
        if let Ok(s) = row {
            suppliers.push(s);
        }
    }
    Ok(suppliers)
}

#[tauri::command]
pub fn create_supplier(state: State<'_, DbState>, payload: CreateSupplierPayload) -> Result<Supplier, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    // Auto-generate code: PO-XXX (sequential)
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM suppliers", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let code = format!("PO-{:03}", count + 1);

    conn.execute(
        "INSERT INTO suppliers (id, code, name, phone, address, is_internal) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, code, payload.name, payload.phone, payload.address, payload.is_internal as i32],
    )
    .map_err(|e| e.to_string())?;

    Ok(Supplier {
        id,
        code,
        name: payload.name,
        phone: payload.phone,
        address: payload.address,
        is_internal: payload.is_internal,
        is_active: true,
        created_at: None,
    })
}

#[tauri::command]
pub fn update_supplier(state: State<'_, DbState>, payload: UpdateSupplierPayload) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE suppliers SET name = ?1, phone = ?2, address = ?3, is_internal = ?4, is_active = ?5 WHERE id = ?6",
        rusqlite::params![payload.name, payload.phone, payload.address, payload.is_internal as i32, payload.is_active as i32, payload.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_supplier(state: State<'_, DbState>, supplier_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM suppliers WHERE id = ?1", rusqlite::params![supplier_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
