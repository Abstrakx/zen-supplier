use std::sync::Mutex;
use tauri::Manager;

pub mod db;
pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let conn = db::init_db(app.handle()).expect("Failed to init database");
            app.manage(commands::DbState(Mutex::new(conn)));
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Supplier
            commands::supplier_cmd::get_suppliers,
            commands::supplier_cmd::create_supplier,
            commands::supplier_cmd::update_supplier,
            commands::supplier_cmd::delete_supplier,
            // Kitchen
            commands::kitchen_cmd::get_kitchens,
            commands::kitchen_cmd::create_kitchen,
            commands::kitchen_cmd::update_kitchen,
            commands::kitchen_cmd::delete_kitchen,
            // Product
            commands::product_cmd::get_products,
            commands::product_cmd::create_product,
            commands::product_cmd::update_product,
            commands::product_cmd::delete_product,
            commands::product_cmd::get_product_units,
            commands::product_cmd::get_price_history,
            commands::product_cmd::record_price,
            // Orders
            commands::order_cmd::create_daily_order,
            commands::order_cmd::get_daily_orders,
            commands::order_cmd::get_daily_order_detail,
            commands::order_cmd::add_order_item,
            commands::order_cmd::update_order_item,
            commands::order_cmd::delete_order_item,
            commands::order_cmd::toggle_item_checklist,
            commands::order_cmd::get_aggregate_shopping_list,
            // Delivery
            commands::delivery_cmd::generate_delivery_note,
            commands::delivery_cmd::get_delivery_notes,
            commands::delivery_cmd::get_delivery_note_detail,
            // Invoice
            commands::invoice_cmd::generate_invoice,
            commands::invoice_cmd::get_invoices,
            commands::invoice_cmd::get_invoice_detail,
            commands::invoice_cmd::finalize_invoice,
            // Reports
            commands::report_cmd::get_margin_report,
            commands::report_cmd::get_daily_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
