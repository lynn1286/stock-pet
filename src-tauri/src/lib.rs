use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{
    AppHandle, Emitter, Manager,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    menu::{Menu, MenuItem},
};
use tokio::time::{sleep, Duration};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockState {
    pub price: f64,
    pub change_pct: f64,
    pub name: String,
    pub symbol: String,
    pub status: String, // "up", "down", "flat"
}

impl Default for StockState {
    fn default() -> Self {
        Self {
            price: 0.0,
            change_pct: 0.0,
            name: String::new(),
            symbol: String::new(),
            status: "flat".to_string(),
        }
    }
}

struct AppState {
    stock_state: Mutex<StockState>,
}

async fn fetch_stock(secid: &str) -> Result<StockState, String> {
    let url = format!(
        "http://push2.eastmoney.com/api/qt/stock/get?secid={}&fields=f57,f58,f43,f170,f171",
        secid
    );

    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("解析失败: {}", e))?;

    let data = json.get("data").ok_or("无数据字段")?;

    let price = data
        .get("f43")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0)
        / 100.0;

    let change_pct = data
        .get("f170")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0)
        / 100.0;

    let name = data
        .get("f58")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let symbol = data
        .get("f57")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let status = if change_pct > 0.0 {
        "up".to_string()
    } else if change_pct < 0.0 {
        "down".to_string()
    } else {
        "flat".to_string()
    };

    Ok(StockState {
        price,
        change_pct,
        name,
        symbol,
        status,
    })
}

async fn fetch_fund(code: &str) -> Result<StockState, String> {
    let url = format!("http://fundgz.1234567.com.cn/js/{}.js", code);

    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let text = resp
        .text()
        .await
        .map_err(|e| format!("读取失败: {}", e))?;

    // 解析 JSONP: jsonpgz({...})
    let json_str = text
        .trim_start_matches("jsonpgz(")
        .trim_end_matches(");")
        .to_string();

    let json: serde_json::Value =
        serde_json::from_str(&json_str).map_err(|e| format!("解析 JSON 失败: {}", e))?;

    let name = json
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let symbol = json
        .get("fundcode")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let gsz = json
        .get("gsz")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let gszzl = json
        .get("gszzl")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let status = if gszzl > 0.0 {
        "up".to_string()
    } else if gszzl < 0.0 {
        "down".to_string()
    } else {
        "flat".to_string()
    };

    Ok(StockState {
        price: gsz,
        change_pct: gszzl,
        name,
        symbol,
        status,
    })
}

#[tauri::command]
fn get_stock_state(state: tauri::State<AppState>) -> StockState {
    state.stock_state.lock().unwrap().clone()
}

fn start_polling(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let stock_secid = "1.600519"; // 茅台
        let fund_code = "000001"; // 华夏成长

        loop {
            // 获取股票数据
            match fetch_stock(stock_secid).await {
                Ok(state) => {
                    let app_state = app.state::<AppState>();
                    *app_state.stock_state.lock().unwrap() = state.clone();
                    let _ = app.emit("stock-state", state);
                }
                Err(e) => {
                    log::error!("获取股票数据失败: {}", e);
                }
            }

            // 获取基金数据
            match fetch_fund(fund_code).await {
                Ok(state) => {
                    let _ = app.emit("fund-state", state);
                }
                Err(e) => {
                    log::error!("获取基金数据失败: {}", e);
                }
            }

            sleep(Duration::from_secs(10)).await;
        }
    });
}

fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示桌宠", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide", "隐藏桌宠", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(move |app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        window.show().ok();
                        window.set_focus().ok();
                    }
                }
                "hide" => {
                    if let Some(window) = app.get_webview_window("main") {
                        window.hide().ok();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        window.hide().ok();
                    } else {
                        window.show().ok();
                        window.set_focus().ok();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .manage(AppState {
            stock_state: Mutex::new(StockState::default()),
        })
        .invoke_handler(tauri::generate_handler![get_stock_state])
        .setup(|app| {
            // macOS: 设置为 accessory 模式，无 Dock 图标
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // 创建托盘
            create_tray(app.handle())?;

            let window = app.get_webview_window("main").unwrap();
            // 去掉窗口阴影
            window.set_shadow(false).ok();
            // 设置背景透明
            window.set_background_color(Some(tauri_utils::config::Color(0, 0, 0, 0))).ok();

            // 将窗口移动到屏幕右下角
            if let Ok(Some(monitor)) = window.primary_monitor() {
                let screen_size = monitor.size();
                let screen_pos = monitor.position();
                let window_size = window.outer_size().unwrap_or(tauri::PhysicalSize::new(80, 80));
                let margin = 20; // 距离边缘的间距

                let x = screen_pos.x + (screen_size.width as i32) - (window_size.width as i32) - margin;
                let y = screen_pos.y + (screen_size.height as i32) - (window_size.height as i32) - margin;

                window.set_position(tauri::PhysicalPosition::new(x, y)).ok();
            }

            start_polling(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
