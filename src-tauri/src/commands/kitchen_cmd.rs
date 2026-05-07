use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use super::DbState;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Kitchen {
    pub id: String,
    pub code: String,
    pub name: String,
    pub address: Option<String>,
    pub pic_name: Option<String>,
    pub pic_phone: Option<String>,
    pub is_active: bool,
    pub created_at: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct CreateKitchenPayload {
    pub name: String,
    pub code: String,
    pub address: Option<String>,
    pub pic_name: Option<String>,
    pub pic_phone: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct UpdateKitchenPayload {
    pub id: String,
    pub name: String,
    pub code: String,
    pub address: Option<String>,
    pub pic_name: Option<String>,
    pub pic_phone: Option<String>,
    pub is_active: bool,
}

#[tauri::command]
pub fn get_kitchens(state: State<'_, DbState>) -> Result<Vec<Kitchen>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, code, name, address, pic_name, pic_phone, is_active, created_at FROM kitchens ORDER BY name")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Kitchen {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                address: row.get(3)?,
                pic_name: row.get(4)?,
                pic_phone: row.get(5)?,
                is_active: row.get::<_, i32>(6)? != 0,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut kitchens = Vec::new();
    for row in rows {
        if let Ok(k) = row {
            kitchens.push(k);
        }
    }
    Ok(kitchens)
}

#[tauri::command]
pub fn create_kitchen(state: State<'_, DbState>, payload: CreateKitchenPayload) -> Result<Kitchen, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO kitchens (id, code, name, address, pic_name, pic_phone) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, payload.code, payload.name, payload.address, payload.pic_name, payload.pic_phone],
    )
    .map_err(|e| e.to_string())?;

    Ok(Kitchen {
        id,
        code: payload.code,
        name: payload.name,
        address: payload.address,
        pic_name: payload.pic_name,
        pic_phone: payload.pic_phone,
        is_active: true,
        created_at: None,
    })
}

#[tauri::command]
pub fn update_kitchen(state: State<'_, DbState>, payload: UpdateKitchenPayload) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE kitchens SET name = ?1, code = ?2, address = ?3, pic_name = ?4, pic_phone = ?5, is_active = ?6 WHERE id = ?7",
        rusqlite::params![payload.name, payload.code, payload.address, payload.pic_name, payload.pic_phone, payload.is_active as i32, payload.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_kitchen(state: State<'_, DbState>, kitchen_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM kitchens WHERE id = ?1", rusqlite::params![kitchen_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
