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
            commands::product_cmd::get_categories,
            commands::product_cmd::get_all_units,
            commands::product_cmd::bulk_update_prices,

            // Orders
            commands::order_cmd::create_daily_order,
            commands::order_cmd::get_daily_orders,
            commands::order_cmd::get_daily_order_detail,
            commands::order_cmd::add_order_item,
            commands::order_cmd::update_order_item,
            commands::order_cmd::delete_order_item,
            commands::order_cmd::delete_daily_order,
            commands::order_cmd::toggle_item_checklist,
            commands::order_cmd::get_next_po_sequence,
            commands::order_cmd::get_aggregate_shopping_list,
            // PO Sections
            commands::order_cmd::create_po_section,
            commands::order_cmd::update_po_section,
            commands::order_cmd::delete_po_section,
            // PO Workflow
            commands::order_cmd::forward_po_to_delivery,
            commands::order_cmd::sync_po_to_delivery,
            commands::order_cmd::update_po_status,
            commands::order_cmd::get_aggregate_by_date,
            // Delivery
            commands::delivery_cmd::generate_delivery_note,
            commands::delivery_cmd::get_delivery_notes,
            commands::delivery_cmd::get_delivery_note_detail,
            commands::delivery_cmd::finalize_delivery_note,
            // Invoice
            commands::invoice_cmd::generate_invoice,
            commands::invoice_cmd::get_invoices,
            commands::invoice_cmd::get_invoice_detail,
            commands::invoice_cmd::finalize_invoice,
            commands::invoice_cmd::update_invoice_item,
            commands::invoice_cmd::delete_invoice_item,
            commands::invoice_cmd::add_manual_invoice_item,
            // Reports
            commands::report_cmd::get_margin_report,
            commands::report_cmd::get_daily_summary,
            commands::report_cmd::get_invoice_report,
            // Stores
            commands::store_cmd::get_stores,
            commands::store_cmd::create_store,
            commands::store_cmd::update_store,
            commands::store_cmd::delete_store,
            // Nota Breakdown
            commands::nota_cmd::get_nota_breakdowns,
            commands::nota_cmd::get_nota_breakdown_detail,
            commands::nota_cmd::create_nota_breakdown,
            commands::nota_cmd::update_nota_breakdown,
            commands::nota_cmd::delete_nota_breakdown,
            commands::nota_cmd::add_nota_section,
            commands::nota_cmd::update_nota_section,
            commands::nota_cmd::delete_nota_section,
            commands::nota_cmd::add_nota_item,
            commands::nota_cmd::update_nota_item,
            commands::nota_cmd::delete_nota_item,
            commands::nota_cmd::finalize_nota,
            // Database
            db::reset_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
