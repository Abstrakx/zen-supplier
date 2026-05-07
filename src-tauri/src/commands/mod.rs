use rusqlite::Connection;
use std::sync::Mutex;

pub mod supplier_cmd;
pub mod kitchen_cmd;
pub mod product_cmd;
pub mod order_cmd;
pub mod delivery_cmd;
pub mod invoice_cmd;
pub mod report_cmd;

pub struct DbState(pub Mutex<Connection>);
