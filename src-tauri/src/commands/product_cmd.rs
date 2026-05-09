use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use super::DbState;

// ═══ STRUCTS ═══

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProductUnit {
    pub id: String,
    pub unit_name: String,
    pub conversion_to_base: f64,
    pub is_base_unit: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PriceRecord {
    pub id: String,
    pub price_type: String,
    pub price: f64,
    pub unit_id: Option<String>,
    pub recorded_at: Option<String>,
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub base_unit: String,
    pub category: Option<String>,
    pub supplier_id: Option<String>,
    pub item_type: Option<String>,
    pub is_active: bool,
    pub units: Vec<ProductUnit>,
    pub latest_buy_price: Option<f64>,
    pub latest_sell_price: Option<f64>,
    pub created_at: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct UnitPayload {
    pub unit_name: String,
    pub conversion_to_base: f64,
    pub is_base_unit: bool,
    pub buy_price: Option<f64>,
    pub sell_price: Option<f64>,
}

#[derive(Deserialize, Debug)]
pub struct CreateProductPayload {
    pub name: String,
    pub base_unit: String,
    pub category: Option<String>,
    pub supplier_id: Option<String>,
    pub item_type: Option<String>,
    pub units: Vec<UnitPayload>,
    pub buy_price: Option<f64>,
    pub sell_price: Option<f64>,
}

#[derive(Deserialize, Debug)]
pub struct UpdateProductPayload {
    pub id: String,
    pub name: String,
    pub base_unit: String,
    pub category: Option<String>,
    pub units: Vec<UnitPayload>,
    pub is_active: bool,
}

// ═══ COMMANDS ═══

#[tauri::command]
pub fn get_products(state: State<'_, DbState>) -> Result<Vec<Product>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, base_unit, category, supplier_id, is_active, created_at, COALESCE(item_type, 'dapur') as item_type FROM products ORDER BY name")
        .map_err(|e| e.to_string())?;

    let product_rows = stmt
        .query_map([], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                base_unit: row.get(2)?,
                category: row.get(3)?,
                supplier_id: row.get(4)?,
                is_active: row.get::<_, i32>(5)? != 0,
                units: vec![],
                latest_buy_price: None,
                latest_sell_price: None,
                created_at: row.get(6)?,
                item_type: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut products = Vec::new();
    for row in product_rows {
        if let Ok(mut p) = row {
            // Get units
            let mut unit_stmt = conn
                .prepare("SELECT id, unit_name, conversion_to_base, is_base_unit FROM product_units WHERE product_id = ?1 ORDER BY is_base_unit DESC, unit_name")
                .map_err(|e| e.to_string())?;
            let unit_rows = unit_stmt
                .query_map([&p.id], |row| {
                    Ok(ProductUnit {
                        id: row.get(0)?,
                        unit_name: row.get(1)?,
                        conversion_to_base: row.get(2)?,
                        is_base_unit: row.get::<_, i32>(3)? != 0,
                    })
                })
                .map_err(|e| e.to_string())?;
            for u in unit_rows {
                if let Ok(unit) = u {
                    p.units.push(unit);
                }
            }

            // Get latest buy price
            p.latest_buy_price = conn
                .query_row(
                    "SELECT price FROM price_history WHERE product_id = ?1 AND price_type = 'buy' ORDER BY recorded_at DESC LIMIT 1",
                    [&p.id],
                    |row| row.get(0),
                )
                .ok();

            // Get latest sell price
            p.latest_sell_price = conn
                .query_row(
                    "SELECT price FROM price_history WHERE product_id = ?1 AND price_type = 'sell' ORDER BY recorded_at DESC LIMIT 1",
                    [&p.id],
                    |row| row.get(0),
                )
                .ok();

            products.push(p);
        }
    }

    Ok(products)
}

#[tauri::command]
pub fn create_product(state: State<'_, DbState>, payload: CreateProductPayload) -> Result<Product, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let product_id = Uuid::new_v4().to_string();

    tx.execute(
        "INSERT INTO products (id, name, base_unit, category, supplier_id, item_type) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![product_id, payload.name, payload.base_unit, payload.category, payload.supplier_id, payload.item_type.as_deref().unwrap_or("dapur")],
    )
    .map_err(|e| e.to_string())?;

    // Always add base unit
    let base_unit_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO product_units (id, product_id, unit_name, conversion_to_base, is_base_unit) VALUES (?1, ?2, ?3, 1.0, 1)",
        rusqlite::params![base_unit_id, product_id, payload.base_unit],
    )
    .map_err(|e| e.to_string())?;

    let mut units = vec![ProductUnit {
        id: base_unit_id.clone(),
        unit_name: payload.base_unit.clone(),
        conversion_to_base: 1.0,
        is_base_unit: true,
    }];

    // Add additional units
    for u in &payload.units {
        if u.is_base_unit {
            continue; // skip base unit duplicate
        }
        let uid = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO product_units (id, product_id, unit_name, conversion_to_base, is_base_unit) VALUES (?1, ?2, ?3, ?4, 0)",
            rusqlite::params![uid, product_id, u.unit_name, u.conversion_to_base],
        )
        .map_err(|e| e.to_string())?;

        if let Some(buy) = u.buy_price {
            if buy > 0.0 {
                let pid = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO price_history (id, product_id, price_type, price, unit_id) VALUES (?1, ?2, 'buy', ?3, ?4)",
                    rusqlite::params![pid, product_id, buy, uid],
                ).map_err(|e| e.to_string())?;
            }
        }
        if let Some(sell) = u.sell_price {
            if sell > 0.0 {
                let pid = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO price_history (id, product_id, price_type, price, unit_id) VALUES (?1, ?2, 'sell', ?3, ?4)",
                    rusqlite::params![pid, product_id, sell, uid],
                ).map_err(|e| e.to_string())?;
            }
        }

        units.push(ProductUnit {
            id: uid,
            unit_name: u.unit_name.clone(),
            conversion_to_base: u.conversion_to_base,
            is_base_unit: false,
        });
    }

    // Record initial buy price
    if let Some(buy) = payload.buy_price {
        if buy > 0.0 {
            let pid = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO price_history (id, product_id, price_type, price, unit_id) VALUES (?1, ?2, 'buy', ?3, ?4)",
                rusqlite::params![pid, product_id, buy, base_unit_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    // Record initial sell price
    if let Some(sell) = payload.sell_price {
        if sell > 0.0 {
            let pid = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO price_history (id, product_id, price_type, price, unit_id) VALUES (?1, ?2, 'sell', ?3, ?4)",
                rusqlite::params![pid, product_id, sell, base_unit_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(Product {
        id: product_id,
        name: payload.name,
        base_unit: payload.base_unit,
        category: payload.category,
        supplier_id: payload.supplier_id,
        item_type: Some(payload.item_type.unwrap_or_else(|| "dapur".to_string())),
        is_active: true,
        units,
        latest_buy_price: payload.buy_price,
        latest_sell_price: payload.sell_price,
        created_at: None,
    })
}

#[tauri::command]
pub fn update_product(state: State<'_, DbState>, payload: UpdateProductPayload) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE products SET name = ?1, base_unit = ?2, category = ?3, is_active = ?4 WHERE id = ?5",
        rusqlite::params![payload.name, payload.base_unit, payload.category, payload.is_active as i32, payload.id],
    )
    .map_err(|e| e.to_string())?;

    // Rebuild units: delete old, insert new
    tx.execute("DELETE FROM product_units WHERE product_id = ?1", rusqlite::params![payload.id])
        .map_err(|e| e.to_string())?;

    // Always add base unit
    let base_uid = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO product_units (id, product_id, unit_name, conversion_to_base, is_base_unit) VALUES (?1, ?2, ?3, 1.0, 1)",
        rusqlite::params![base_uid, payload.id, payload.base_unit],
    )
    .map_err(|e| e.to_string())?;

    for u in &payload.units {
        if u.is_base_unit {
            continue;
        }
        let uid = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO product_units (id, product_id, unit_name, conversion_to_base, is_base_unit) VALUES (?1, ?2, ?3, ?4, 0)",
            rusqlite::params![uid, payload.id, u.unit_name, u.conversion_to_base],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_product(state: State<'_, DbState>, product_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM products WHERE id = ?1", rusqlite::params![product_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_product_units(state: State<'_, DbState>, product_id: String) -> Result<Vec<ProductUnit>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, unit_name, conversion_to_base, is_base_unit FROM product_units WHERE product_id = ?1 ORDER BY is_base_unit DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&product_id], |row| {
            Ok(ProductUnit {
                id: row.get(0)?,
                unit_name: row.get(1)?,
                conversion_to_base: row.get(2)?,
                is_base_unit: row.get::<_, i32>(3)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut units = Vec::new();
    for r in rows {
        if let Ok(u) = r {
            units.push(u);
        }
    }
    Ok(units)
}

#[tauri::command]
pub fn get_price_history(state: State<'_, DbState>, product_id: String) -> Result<Vec<PriceRecord>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, price_type, price, unit_id, recorded_at, notes FROM price_history WHERE product_id = ?1 ORDER BY recorded_at DESC LIMIT 100")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&product_id], |row| {
            Ok(PriceRecord {
                id: row.get(0)?,
                price_type: row.get(1)?,
                price: row.get(2)?,
                unit_id: row.get(3)?,
                recorded_at: row.get(4)?,
                notes: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut records = Vec::new();
    for r in rows {
        if let Ok(p) = r {
            records.push(p);
        }
    }
    Ok(records)
}

#[tauri::command]
pub fn record_price(state: State<'_, DbState>, product_id: String, price_type: String, price: f64, unit_id: Option<String>, notes: Option<String>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO price_history (id, product_id, price_type, price, unit_id, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, product_id, price_type, price, unit_id, notes],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
pub fn get_categories(state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let mut categories = Vec::new();
    for r in rows {
        if let Ok(c) = r {
            categories.push(c);
        }
    }
    Ok(categories)
}

#[tauri::command]
pub fn get_all_units(state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT DISTINCT unit_name FROM product_units WHERE unit_name IS NOT NULL AND unit_name != '' ORDER BY unit_name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let mut units = Vec::new();
    for r in rows {
        if let Ok(u) = r {
            units.push(u);
        }
    }
    Ok(units)
}
