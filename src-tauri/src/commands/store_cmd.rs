use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use super::DbState;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Store {
    pub id: String,
    pub name: String,
    pub code: Option<String>,
    pub address: Option<String>,
    pub pic_name: Option<String>,
    pub pic_phone: Option<String>,
    pub is_active: bool,
    pub created_at: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct CreateStorePayload {
    pub name: String,
    pub code: Option<String>,
    pub address: Option<String>,
    pub pic_name: Option<String>,
    pub pic_phone: Option<String>,
}

#[tauri::command]
pub fn get_stores(state: State<'_, DbState>) -> Result<Vec<Store>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, code, address, pic_name, pic_phone, is_active, created_at FROM stores ORDER BY name")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([], |row| {
            Ok(Store {
                id: row.get(0)?,
                name: row.get(1)?,
                code: row.get(2)?,
                address: row.get(3)?,
                pic_name: row.get(4)?,
                pic_phone: row.get(5)?,
                is_active: row.get::<_, i32>(6)? != 0,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut stores = Vec::new();
    for r in rows {
        if let Ok(s) = r {
            stores.push(s);
        }
    }
    Ok(stores)
}

#[tauri::command]
pub fn create_store(state: State<'_, DbState>, payload: CreateStorePayload) -> Result<Store, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO stores (id, name, code, address, pic_name, pic_phone) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, payload.name, payload.code, payload.address, payload.pic_name, payload.pic_phone],
    )
    .map_err(|e| e.to_string())?;

    Ok(Store {
        id,
        name: payload.name,
        code: payload.code,
        address: payload.address,
        pic_name: payload.pic_name,
        pic_phone: payload.pic_phone,
        is_active: true,
        created_at: None,
    })
}

#[tauri::command]
pub fn update_store(state: State<'_, DbState>, id: String, payload: CreateStorePayload) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "UPDATE stores SET name = ?1, code = ?2, address = ?3, pic_name = ?4, pic_phone = ?5 WHERE id = ?6",
        rusqlite::params![payload.name, payload.code, payload.address, payload.pic_name, payload.pic_phone, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_store(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM stores WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
