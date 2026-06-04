use chrono::{Datelike, Local, Timelike, Weekday};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use tokio::time::{sleep, Duration};

// ========== 数据结构 ==========

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AssetType {
    Stock,
    Etf,
    Fund,
}

impl Default for AssetType {
    fn default() -> Self {
        AssetType::Stock
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockConfig {
    pub secid: String,
    pub name: String,
    pub is_primary: bool,
    #[serde(default)]
    pub quantity: f64,
    #[serde(default)]
    pub cost_price: f64,
    #[serde(default)]
    pub asset_type: AssetType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockState {
    pub price: f64,
    pub change_pct: f64,
    pub name: String,
    pub symbol: String,
    pub secid: String,
    pub status: String,
    pub quantity: f64,
    pub cost_price: f64,
    pub market_value: f64,
    pub cost_value: f64,
    pub profit: f64,
    pub profit_pct: f64,
    pub daily_profit: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DisplayMode {
    Primary,
    Summary,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TrayDisplay {
    Amount,
    Pct,
}

impl Default for TrayDisplay {
    fn default() -> Self {
        TrayDisplay::Pct
    }
}

/// 图片识别（OpenAI 兼容视觉接口）配置。明文存本地 config.json，是云方案的固有代价。
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VisionConfig {
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub api_key: String,
    #[serde(default)]
    pub model: String,
}

/// 从持仓截图识别出的单条原始记录（尚未解析出权威 secid）。
/// name/market_value/profit/quantity/cost_price 为图中读到的事实；
/// normalized_name/guess_code/guess_asset_type 为视觉模型基于知识做的归一化猜测，
/// 仅用于后续向东方财富检索/校验，绝不直接采信。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecognizedHolding {
    pub name: String,
    pub code: String,
    pub market_value: f64,
    pub profit: f64,
    /// 份额/持仓数量，图中有就填（东方财富交易页有），否则 0。
    pub quantity: f64,
    /// 成本价，图中有就填（东方财富交易页有），否则 0。
    pub cost_price: f64,
    pub truncated: bool,
    /// 模型归一化后的 A 股市场标准简称（如「东财通信C」）。
    pub normalized_name: String,
    /// 模型猜测的 6 位代码，需经东方财富反查校验后才可用。
    pub guess_code: String,
    pub guess_asset_type: AssetType,
}

/// 识图 + 确定性解析后的单条记录，candidates 全部来自东方财富权威数据。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecognizedHoldingRow {
    pub name: String,
    pub code: String,
    pub market_value: f64,
    pub profit: f64,
    pub quantity: f64,
    pub cost_price: f64,
    pub truncated: bool,
    pub candidates: Vec<SearchResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub stocks: Vec<StockConfig>,
    pub display_mode: DisplayMode,
    #[serde(default)]
    pub tray_display: TrayDisplay,
    #[serde(default)]
    pub vision: VisionConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            stocks: vec![],
            display_mode: DisplayMode::Summary,
            tray_display: TrayDisplay::Pct,
            vision: VisionConfig::default(),
        }
    }
}

struct AppState {
    config: Mutex<AppConfig>,
    stocks_state: Mutex<Vec<StockState>>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
enum TradeStatus {
    Trading,
    Rest,
    Sleep,
}

// ========== 配置管理 ==========

fn get_config_path() -> PathBuf {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("stock-pet");
    std::fs::create_dir_all(&config_dir).ok();
    config_dir.join("config.json")
}

fn load_config() -> AppConfig {
    let path = get_config_path();
    if path.exists() {
        let content = std::fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        let config = AppConfig::default();
        save_config(&config);
        config
    }
}

fn save_config(config: &AppConfig) {
    let path = get_config_path();
    if let Ok(content) = serde_json::to_string_pretty(config) {
        std::fs::write(path, content).ok();
    }
}

// ========== 交易时间判断 ==========

fn is_trading_day() -> bool {
    let now = Local::now();
    let weekday = now.weekday();
    weekday != Weekday::Sat && weekday != Weekday::Sun
}

fn is_trading_hours() -> bool {
    let now = Local::now();
    let current_minutes = now.hour() * 60 + now.minute();
    let morning_start = 9 * 60 + 30;
    let morning_end = 11 * 60 + 30;
    let afternoon_start = 13 * 60;
    let afternoon_end = 15 * 60;
    (current_minutes >= morning_start && current_minutes <= morning_end)
        || (current_minutes >= afternoon_start && current_minutes <= afternoon_end)
}

fn get_trade_status() -> TradeStatus {
    if !is_trading_day() {
        return TradeStatus::Sleep;
    }
    if !is_trading_hours() {
        return TradeStatus::Rest;
    }
    TradeStatus::Trading
}

// ========== 数据获取 ==========

async fn fetch_stock_price(secid: &str) -> Result<(f64, f64, String, String), String> {
    let url = format!(
        "http://push2.eastmoney.com/api/qt/stock/get?secid={}&fields=f57,f58,f43,f170,f171",
        secid
    );
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    let json: serde_json::Value = resp.json().await.map_err(|e| format!("解析失败: {}", e))?;
    let data = json.get("data").ok_or("无数据字段")?;

    let price = data.get("f43").and_then(|v| v.as_f64()).unwrap_or(0.0) / 100.0;
    let change_pct = data.get("f170").and_then(|v| v.as_f64()).unwrap_or(0.0) / 100.0;
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

    Ok((price, change_pct, name, symbol))
}

async fn fetch_fund_price(secid: &str) -> Result<(f64, f64, String, String), String> {
    // secid 格式: "0.000001"，提取基金代码
    let code = secid.split('.').last().unwrap_or(secid);
    let url = format!("http://fundgz.1234567.com.cn/js/{}.js", code);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    let text = resp.text().await.map_err(|e| format!("读取失败: {}", e))?;

    // 返回格式: jsonpgz({"fundcode":"000001","name":"...","gsz":"1.23","gszzl":"0.45",...});
    let json_str = text
        .strip_prefix("jsonpgz(")
        .and_then(|s| s.strip_suffix(");"))
        .ok_or("解析格式错误")?;
    let data: serde_json::Value =
        serde_json::from_str(json_str).map_err(|e| format!("JSON解析失败: {}", e))?;

    let price = data
        .get("gsz")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    let change_pct = data
        .get("gszzl")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    let name = data
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let symbol = data
        .get("fundcode")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok((price, change_pct, name, symbol))
}

fn build_stock_state(
    config: &StockConfig,
    price: f64,
    change_pct: f64,
    name: String,
    symbol: String,
) -> StockState {
    let market_value = price * config.quantity;
    let cost_value = config.cost_price * config.quantity;
    let profit = market_value - cost_value;
    let profit_pct = if config.cost_price > 0.0 {
        (price - config.cost_price) / config.cost_price * 100.0
    } else {
        0.0
    };
    let daily_profit = if config.quantity > 0.0 {
        market_value * change_pct / 100.0
    } else {
        0.0
    };

    let status = if config.quantity > 0.0 && config.cost_price > 0.0 {
        if profit > 0.01 {
            "up"
        } else if profit < -0.01 {
            "down"
        } else {
            "flat"
        }
    } else {
        if change_pct > 0.0 {
            "up"
        } else if change_pct < 0.0 {
            "down"
        } else {
            "flat"
        }
    };

    StockState {
        price,
        change_pct,
        name,
        symbol,
        secid: config.secid.clone(),
        status: status.to_string(),
        quantity: config.quantity,
        cost_price: config.cost_price,
        market_value,
        cost_value,
        profit,
        profit_pct,
        daily_profit,
    }
}

async fn fetch_price(stock: &StockConfig) -> Result<(f64, f64, String, String), String> {
    match stock.asset_type {
        AssetType::Fund => fetch_fund_price(&stock.secid).await,
        _ => fetch_stock_price(&stock.secid).await,
    }
}

async fn fetch_all_stocks(stocks: &[StockConfig]) -> Vec<StockState> {
    let mut results = Vec::new();
    for stock in stocks {
        match fetch_price(stock).await {
            Ok((price, change_pct, name, symbol)) => {
                results.push(build_stock_state(stock, price, change_pct, name, symbol));
            }
            Err(e) => log::error!("获取 {} 失败: {}", stock.name, e),
        }
    }
    results
}

// ========== 计算展示状态 ==========

fn calc_display_state(stocks: &[StockState], mode: &DisplayMode, config: &AppConfig) -> StockState {
    if stocks.is_empty() {
        return StockState {
            price: 0.0,
            change_pct: 0.0,
            name: "无持仓".to_string(),
            symbol: String::new(),
            secid: String::new(),
            status: "flat".to_string(),
            quantity: 0.0,
            cost_price: 0.0,
            market_value: 0.0,
            cost_value: 0.0,
            profit: 0.0,
            profit_pct: 0.0,
            daily_profit: 0.0,
        };
    }

    match mode {
        DisplayMode::Primary => {
            let primary_secid = config
                .stocks
                .iter()
                .find(|s| s.is_primary)
                .map(|s| s.secid.as_str());
            if let Some(secid) = primary_secid {
                if let Some(state) = stocks.iter().find(|s| s.secid == secid) {
                    return state.clone();
                }
            }
            stocks[0].clone()
        }
        DisplayMode::Summary => {
            let total_daily_profit: f64 = stocks.iter().map(|s| s.daily_profit).sum();
            let total_cost: f64 = stocks.iter().map(|s| s.cost_value).sum();
            let total_market: f64 = stocks.iter().map(|s| s.market_value).sum();
            let daily_pct = if total_market > 0.0 {
                total_daily_profit / total_market * 100.0
            } else {
                0.0
            };
            let status = if total_daily_profit > 0.01 {
                "up"
            } else if total_daily_profit < -0.01 {
                "down"
            } else {
                "flat"
            };

            StockState {
                price: 0.0,
                change_pct: daily_pct,
                name: format!("{}只股票", stocks.len()),
                symbol: "summary".to_string(),
                secid: "summary".to_string(),
                status: status.to_string(),
                quantity: 0.0,
                cost_price: 0.0,
                market_value: total_market,
                cost_value: total_cost,
                profit: total_daily_profit,
                profit_pct: daily_pct,
                daily_profit: total_daily_profit,
            }
        }
    }
}

// ========== 股票搜索 ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub secid: String,
    pub name: String,
    pub code: String,
    pub market: String,
    pub asset_type: AssetType,
}

async fn search_stocks_api(query: &str) -> Result<Vec<SearchResult>, String> {
    let url = format!(
        "http://searchapi.eastmoney.com/api/suggest/get?input={}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8",
        query
    );

    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("搜索失败: {}", e))?;
    let json: serde_json::Value = resp.json().await.map_err(|e| format!("解析失败: {}", e))?;

    let data = json.get("QuotationCodeTable").and_then(|t| t.get("Data"));
    let Some(items) = data.and_then(|d| d.as_array()) else {
        return Ok(vec![]);
    };

    let mut results = Vec::new();
    for item in items {
        let code = item
            .get("Code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let name = item
            .get("Name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let market_raw = item
            .get("MktNum")
            .and_then(|v| v.as_str())
            .unwrap_or("0")
            .to_string();
        let stock_type = item
            .get("SecurityTypeName")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        // 保留 A 股、ETF、基金
        let is_valid = matches!(
            stock_type,
            "沪A" | "深A" | "沪ETF" | "深ETF" | "创业板" | "科创板" | "北交所" | "基金"
        );
        if !is_valid {
            continue;
        }

        // 沪市=1，深市=0
        let market = if market_raw == "1" { "1" } else { "0" };
        let secid = format!("{}.{}", market, code);

        // JYS=OTCFUND 是场外基金，用 fundgz 拉净值；其余用 push2 拉行情
        let jys = item.get("JYS").and_then(|v| v.as_str()).unwrap_or("");
        let asset_type = if jys == "OTCFUND" {
            AssetType::Fund
        } else if stock_type.contains("ETF") {
            AssetType::Etf
        } else {
            AssetType::Stock
        };

        results.push(SearchResult {
            secid,
            name,
            code,
            market: market_raw,
            asset_type,
        });
    }

    Ok(results)
}

// ========== 图片识别持仓 ==========

const VISION_PROMPT: &str = "你是基金/股票持仓截图识别助手。从图片的持仓列表中提取每一条真实持仓，输出一个 JSON 数组。\n\
每个元素字段：\n\
- name: 名称，按图中显示原样（可能被省略号截断，保留可见部分）\n\
- code: 图中显示的 6 位代码，没显示就用空字符串\n\
- market_value: 持仓金额 / 持仓市值，单位元，数字（去掉千分位逗号）\n\
- profit: 持有收益（累计收益 / 持仓盈亏），单位元，数字，亏损为负\n\
- quantity: 份额 / 持仓数量，图中明确给出才填数字，否则填 0\n\
- cost_price: 成本价 / 成本，图中明确给出才填数字，否则填 0\n\
- normalized_name: 你判断该标的在中国 A 股市场的标准简称（含份额类别，如「东财通信C」「广发纳斯达克100ETF联接人民币C」）。名称被截断或是平台缩写时，结合上下文还原成最可能的完整标准简称；无把握就回退为 name\n\
- guess_code: 你判断的 6 位代码，有把握才填，否则空字符串\n\
- asset_type: \"stock\" | \"etf\" | \"fund\"（场外基金为 fund，场内 ETF 为 etf）\n\
规则：\n\
- 「昨日收益」「当日收益」不是 profit，profit 只取「持有收益 / 累计收益 / 持仓盈亏」这一列。\n\
- 跳过分组标题（如「XX 基金财富号」）、营销与资讯条目、合计 / 总览行。\n\
- quantity 与 cost_price 只在图中真实存在时填，绝不臆造。\n\
只输出 JSON 数组本身，不要任何解释文字，不要 markdown 代码块标记。";

/// 把模型返回的数值字段稳健地转成 f64：兼容数字与带逗号/符号/单位的字符串。
fn json_to_f64(v: &serde_json::Value) -> f64 {
    match v {
        serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0),
        serde_json::Value::String(s) => {
            let cleaned: String = s
                .chars()
                .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-')
                .collect();
            cleaned.parse::<f64>().unwrap_or(0.0)
        }
        _ => 0.0,
    }
}

/// 去掉模型可能包裹的 ```json 代码块标记。
fn strip_code_fence(s: &str) -> String {
    let mut t = s.trim();
    if let Some(rest) = t.strip_prefix("```json") {
        t = rest.trim();
    } else if let Some(rest) = t.strip_prefix("```") {
        t = rest.trim();
    }
    if let Some(rest) = t.strip_suffix("```") {
        t = rest.trim();
    }
    t.to_string()
}

/// 按字符截断，用于错误信息回显，避免把超长响应体整个抛出。
fn truncate_chars(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        let head: String = s.chars().take(max).collect();
        format!("{}…", head)
    }
}

fn parse_asset_type(raw: &str) -> AssetType {
    match raw.trim().to_lowercase().as_str() {
        "etf" => AssetType::Etf,
        "fund" => AssetType::Fund,
        _ => AssetType::Stock,
    }
}

/// 调用用户配置的 OpenAI 兼容接口，返回 assistant 文本内容。
async fn vision_chat(
    client: &reqwest::Client,
    vision: &VisionConfig,
    messages: serde_json::Value,
) -> Result<String, String> {
    let endpoint = format!("{}/chat/completions", vision.base_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "model": vision.model,
        "temperature": 0,
        "messages": messages,
    });

    let resp = client
        .post(&endpoint)
        .bearer_auth(&vision.api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("AI 请求失败: {}", e))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("读取 AI 响应失败: {}", e))?;

    if !status.is_success() {
        return Err(format!(
            "AI 服务返回 {}: {}",
            status.as_u16(),
            truncate_chars(&text, 200)
        ));
    }

    let json: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("AI 响应解析失败: {}", e))?;
    json.pointer("/choices/0/message/content")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "AI 响应缺少内容字段".to_string())
}

fn parse_json_array(content: &str, err_label: &str) -> Result<Vec<serde_json::Value>, String> {
    let cleaned = strip_code_fence(content);
    let arr: serde_json::Value = serde_json::from_str(&cleaned).map_err(|e| {
        format!(
            "{}: {} (原文: {})",
            err_label,
            e,
            truncate_chars(&cleaned, 120)
        )
    })?;
    arr.as_array()
        .cloned()
        .ok_or_else(|| format!("{}: 内容不是 JSON 数组", err_label))
}

async fn recognize_one(
    client: &reqwest::Client,
    vision: &VisionConfig,
    image: &str,
) -> Result<Vec<RecognizedHolding>, String> {
    let messages = serde_json::json!([{
        "role": "user",
        "content": [
            { "type": "text", "text": VISION_PROMPT },
            { "type": "image_url", "image_url": { "url": image } }
        ]
    }]);
    let content = vision_chat(client, vision, messages).await?;
    let items = parse_json_array(&content, "识图结果无效")?;

    let mut result = Vec::new();
    for item in items {
        let name = item
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if name.is_empty() {
            continue;
        }
        let str_field = |key: &str| {
            item.get(key)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string()
        };
        let code = str_field("code");
        let market_value = item.get("market_value").map(json_to_f64).unwrap_or(0.0);
        let profit = item.get("profit").map(json_to_f64).unwrap_or(0.0);
        let quantity = item.get("quantity").map(json_to_f64).unwrap_or(0.0);
        let cost_price = item.get("cost_price").map(json_to_f64).unwrap_or(0.0);
        let truncated = name.contains('…') || name.contains("...");
        let normalized_name = {
            let n = str_field("normalized_name");
            if n.is_empty() { name.clone() } else { n }
        };
        let guess_code = str_field("guess_code");
        let guess_asset_type = item
            .get("asset_type")
            .and_then(|v| v.as_str())
            .map(parse_asset_type)
            .unwrap_or_default();

        result.push(RecognizedHolding {
            name,
            code,
            market_value,
            profit,
            quantity,
            cost_price,
            truncated,
            normalized_name,
            guess_code,
            guess_asset_type,
        });
    }

    Ok(result)
}

fn is_six_digit(s: &str) -> bool {
    let s = s.trim();
    s.len() == 6 && s.chars().all(|c| c.is_ascii_digit())
}

/// 把若干字符串去空白、去空、去重后保序返回，用于多个名称查询源。
fn dedup_nonempty(items: &[&str]) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for raw in items {
        let s = raw.trim().to_string();
        if !s.is_empty() && !out.contains(&s) {
            out.push(s);
        }
    }
    out
}

/// 东方财富天天基金全文（模糊）搜索：用于名称别名 / 截断 / 份额分级场景，
/// 只取场外基金（CATEGORYDESC = 基金），返回权威 SearchResult（场外基金 secid 用 0.{code}）。
async fn fund_fulltext_search(client: &reqwest::Client, key: &str) -> Vec<SearchResult> {
    let key = key.trim();
    if key.is_empty() {
        return vec![];
    }
    let url = format!(
        "https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key={}",
        key
    );
    let Ok(resp) = client.get(&url).send().await else {
        return vec![];
    };
    let Ok(json) = resp.json::<serde_json::Value>().await else {
        return vec![];
    };
    let Some(items) = json.get("Datas").and_then(|d| d.as_array()) else {
        return vec![];
    };

    let mut results = Vec::new();
    for item in items {
        let category = item
            .get("CATEGORYDESC")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if category != "基金" {
            continue;
        }
        let code = item.get("CODE").and_then(|v| v.as_str()).unwrap_or("");
        if !is_six_digit(code) {
            continue;
        }
        let name = item
            .get("NAME")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        // 场内 ETF（名称含 ETF 但非「ETF联接」）应由 suggest 给出正确市场/类型，
        // 全文这里只保留真正的场外基金，避免生成错误的 0.{code}/fund secid。
        if name.contains("ETF") && !name.contains("联接") && !name.contains("連接") {
            continue;
        }
        results.push(SearchResult {
            secid: format!("0.{}", code),
            name,
            code: code.to_string(),
            market: "0".to_string(),
            asset_type: AssetType::Fund,
        });
    }
    results
}

/// 为单条识图结果解析出权威候选标的，层层兜底，全部来自东方财富数据：
/// 1) 图中代码 / 模型猜测代码 → suggest 反查校验
/// 2) 标准简称 / 原始名 → suggest 前缀检索
/// 3) 标准简称 / 原始名 → 基金全文搜索（补别名、截断、份额分级）
async fn resolve_candidates(
    client: &reqwest::Client,
    holding: &RecognizedHolding,
) -> Vec<SearchResult> {
    let mut out: Vec<SearchResult> = Vec::new();
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    let push = |results: Vec<SearchResult>,
                out: &mut Vec<SearchResult>,
                seen: &mut std::collections::HashSet<String>| {
        for r in results {
            if r.secid.is_empty() {
                continue;
            }
            if seen.insert(r.secid.clone()) {
                out.push(r);
            }
        }
    };

    // 1. 按确切代码反查，最权威（图中代码优先于模型猜测）
    for code in [holding.code.as_str(), holding.guess_code.as_str()] {
        if is_six_digit(code) {
            if let Ok(rs) = search_stocks_api(code).await {
                push(rs, &mut out, &mut seen);
            }
        }
    }

    let names = dedup_nonempty(&[holding.normalized_name.as_str(), holding.name.as_str()]);

    // 2. 按名称前缀检索（标准简称优先）
    for q in &names {
        if let Ok(rs) = search_stocks_api(q).await {
            push(rs, &mut out, &mut seen);
        }
    }

    // 3. 基金全文模糊搜索，补齐别名 / 截断 / 份额分级
    for q in &names {
        if out.len() >= 12 {
            break;
        }
        let rs = fund_fulltext_search(client, q).await;
        push(rs, &mut out, &mut seen);
    }

    out.truncate(12);
    out
}

/// 逐条把识图结果解析为带权威候选的行。
async fn resolve_holdings(
    client: &reqwest::Client,
    holdings: &[RecognizedHolding],
) -> Vec<RecognizedHoldingRow> {
    let mut rows = Vec::with_capacity(holdings.len());
    for h in holdings {
        let candidates = resolve_candidates(client, h).await;
        rows.push(RecognizedHoldingRow {
            name: h.name.clone(),
            code: h.code.clone(),
            market_value: h.market_value,
            profit: h.profit,
            quantity: h.quantity,
            cost_price: h.cost_price,
            truncated: h.truncated,
            candidates,
        });
    }
    rows
}

/// 图片导入持仓时的"重新搜索"：确定性来源（suggest + 基金全文），按名称/代码查候选。
async fn search_candidates(client: &reqwest::Client, query: &str) -> Vec<SearchResult> {
    let q = query.trim();
    if q.is_empty() {
        return vec![];
    }
    let mut out: Vec<SearchResult> = Vec::new();
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    if let Ok(rs) = search_stocks_api(q).await {
        for r in rs {
            if seen.insert(r.secid.clone()) {
                out.push(r);
            }
        }
    }
    for r in fund_fulltext_search(client, q).await {
        if out.len() >= 12 {
            break;
        }
        if seen.insert(r.secid.clone()) {
            out.push(r);
        }
    }
    out.truncate(12);
    out
}

// ========== Tauri 命令 ==========

#[tauri::command]
async fn refresh_prices(
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<Vec<StockState>, String> {
    let config = state.config.lock().unwrap().clone();
    let stocks = fetch_all_stocks(&config.stocks).await;
    *state.stocks_state.lock().unwrap() = stocks.clone();
    let display = calc_display_state(&stocks, &config.display_mode, &config);
    let _ = app.emit("stock-state", &display);
    let _ = app.emit("stocks-update", &stocks);
    Ok(stocks)
}

#[tauri::command]
fn get_config(state: tauri::State<AppState>) -> AppConfig {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
fn get_stocks_state(state: tauri::State<AppState>) -> Vec<StockState> {
    state.stocks_state.lock().unwrap().clone()
}

#[tauri::command]
async fn search_stock(query: String) -> Result<Vec<SearchResult>, String> {
    search_stocks_api(&query).await
}

#[tauri::command]
async fn fetch_single_price(secid: String, asset_type: AssetType) -> Result<f64, String> {
    let stock = StockConfig {
        secid,
        name: String::new(),
        is_primary: false,
        quantity: 0.0,
        cost_price: 0.0,
        asset_type,
    };
    let (price, _, _, _) = fetch_price(&stock).await?;
    Ok(price)
}

#[tauri::command]
fn add_stock(
    secid: String,
    name: String,
    quantity: f64,
    cost_price: f64,
    asset_type: AssetType,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    if config.stocks.iter().any(|s| s.secid == secid) {
        return Err("已存在".to_string());
    }
    let is_primary = config.stocks.is_empty();
    config.stocks.push(StockConfig {
        secid,
        name,
        is_primary,
        quantity,
        cost_price,
        asset_type,
    });
    save_config(&config);
    Ok(())
}

#[tauri::command]
fn update_stock(
    secid: String,
    quantity: f64,
    cost_price: f64,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    if let Some(stock) = config.stocks.iter_mut().find(|s| s.secid == secid) {
        stock.quantity = quantity;
        stock.cost_price = cost_price;
        save_config(&config);
        Ok(())
    } else {
        Err("股票不存在".to_string())
    }
}

#[tauri::command]
fn remove_stock(secid: String, state: tauri::State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    let was_primary = config
        .stocks
        .iter()
        .find(|s| s.secid == secid)
        .map(|s| s.is_primary)
        .unwrap_or(false);
    config.stocks.retain(|s| s.secid != secid);
    if was_primary {
        if let Some(first) = config.stocks.first_mut() {
            first.is_primary = true;
        }
    }
    save_config(&config);
    Ok(())
}

#[tauri::command]
fn set_primary(secid: String, state: tauri::State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    for stock in &mut config.stocks {
        stock.is_primary = stock.secid == secid;
    }
    save_config(&config);
    Ok(())
}

#[tauri::command]
fn set_display_mode(
    mode: DisplayMode,
    state: tauri::State<AppState>,
    app: AppHandle,
) -> Result<(), String> {
    {
        let mut config = state.config.lock().unwrap();
        config.display_mode = mode;
        save_config(&config);
    }
    let config = state.config.lock().unwrap().clone();
    let stocks = state.stocks_state.lock().unwrap().clone();
    refresh_tray(&app, &stocks, &config);
    Ok(())
}

// ========== 托盘刷新 ==========

fn refresh_tray(app: &AppHandle, stocks: &[StockState], config: &AppConfig) {
    let Some(tray) = app.tray_by_id("main-tray") else {
        return;
    };

    let trade_status = get_trade_status();
    let display = calc_display_state(stocks, &config.display_mode, config);

    let title = match trade_status {
        TradeStatus::Trading | TradeStatus::Rest => match config.tray_display {
            TrayDisplay::Amount => {
                let sign = if display.daily_profit >= 0.0 { "+" } else { "" };
                format!("\u{2002}{}{:.0}元", sign, display.daily_profit)
            }
            TrayDisplay::Pct => {
                let sign = if display.change_pct >= 0.0 { "+" } else { "" };
                format!("\u{2002}{}{:.2}%", sign, display.change_pct)
            }
        },
        TradeStatus::Sleep => "\u{2002}休息".to_string(),
    };

    let tooltip = match trade_status {
        TradeStatus::Trading | TradeStatus::Rest => {
            let sign_dp = if display.daily_profit >= 0.0 { "+" } else { "" };
            let sign_cp = if display.change_pct >= 0.0 { "+" } else { "" };
            format!(
                "{} 当日{}{:.0}元 ({}{:.2}%)",
                display.name, sign_dp, display.daily_profit, sign_cp, display.change_pct
            )
        }
        TradeStatus::Sleep => "股票桌宠 - 非交易日".to_string(),
    };

    let _ = tray.set_title(Some(&title));
    let _ = tray.set_tooltip(Some(&tooltip));
}

#[tauri::command]
fn set_tray_display(
    mode: TrayDisplay,
    state: tauri::State<AppState>,
    app: AppHandle,
) -> Result<(), String> {
    {
        let mut cfg = state.config.lock().unwrap();
        cfg.tray_display = mode;
        save_config(&cfg);
    }
    let config = state.config.lock().unwrap().clone();
    let stocks = state.stocks_state.lock().unwrap().clone();
    refresh_tray(&app, &stocks, &config);
    Ok(())
}

#[tauri::command]
fn get_vision_config(state: tauri::State<AppState>) -> VisionConfig {
    state.config.lock().unwrap().vision.clone()
}

#[tauri::command]
fn set_vision_config(
    base_url: String,
    api_key: String,
    model: String,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.vision = VisionConfig {
        base_url: base_url.trim().to_string(),
        api_key: api_key.trim().to_string(),
        model: model.trim().to_string(),
    };
    save_config(&config);
    Ok(())
}

#[tauri::command]
async fn lookup_stock_ai(query: String) -> Result<Vec<SearchResult>, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("创建请求客户端失败: {}", e))?;
    Ok(search_candidates(&client, &query).await)
}

#[tauri::command]
async fn recognize_holdings(
    images: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<RecognizedHoldingRow>, String> {
    let vision = { state.config.lock().unwrap().vision.clone() };
    if vision.base_url.is_empty() || vision.api_key.is_empty() || vision.model.is_empty() {
        return Err("未配置图片识别服务，请先在设置中填写 API 地址、密钥和模型名".to_string());
    }
    if images.is_empty() {
        return Err("没有可识别的图片".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| format!("创建请求客户端失败: {}", e))?;

    let mut all = Vec::new();
    for image in &images {
        let holdings = recognize_one(&client, &vision, image).await?;
        all.extend(holdings);
    }
    Ok(resolve_holdings(&client, &all).await)
}

// ========== 轮询逻辑 ==========

fn start_polling(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            let trade_status = get_trade_status();
            let _ = app.emit("trade-status", &trade_status);

            let app_state = app.state::<AppState>();

            let (stocks, config) = match trade_status {
                TradeStatus::Trading => {
                    let config = app_state.config.lock().unwrap().clone();
                    let stocks = fetch_all_stocks(&config.stocks).await;
                    *app_state.stocks_state.lock().unwrap() = stocks.clone();
                    let _ = app.emit("stocks-update", &stocks);
                    (stocks, config)
                }
                _ => {
                    let config = app_state.config.lock().unwrap().clone();
                    let stocks = app_state.stocks_state.lock().unwrap().clone();
                    (stocks, config)
                }
            };

            let display = calc_display_state(&stocks, &config.display_mode, &config);
            let _ = app.emit("stock-state", &display);
            refresh_tray(&app, &stocks, &config);

            let interval = match trade_status {
                TradeStatus::Trading => Duration::from_secs(10),
                _ => Duration::from_secs(30),
            };
            sleep(interval).await;
        }
    });
}

// ========== Mock 悬浮设置面板 ==========

fn position_window_top_right(window: &tauri::WebviewWindow, margin: i32) -> tauri::Result<()> {
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let screen_size = monitor.size();
        let screen_pos = monitor.position();
        let window_size = window
            .outer_size()
            .unwrap_or(tauri::PhysicalSize::new(320, 300));
        let x = screen_pos.x + (screen_size.width as i32) - (window_size.width as i32) - margin;
        let y = screen_pos.y + margin;
        window.set_position(tauri::PhysicalPosition::new(x, y))?;
    }
    Ok(())
}

fn position_window_bottom_right(window: &tauri::WebviewWindow, margin: i32) -> tauri::Result<()> {
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let screen_size = monitor.size();
        let screen_pos = monitor.position();
        let window_size = window
            .outer_size()
            .unwrap_or(tauri::PhysicalSize::new(100, 100));
        let x = screen_pos.x + (screen_size.width as i32) - (window_size.width as i32) - margin;
        let y = screen_pos.y + (screen_size.height as i32) - (window_size.height as i32) - margin;
        window.set_position(tauri::PhysicalPosition::new(x, y))?;
    }
    Ok(())
}

fn configure_pet_window(window: &tauri::WebviewWindow) {
    window.set_shadow(false).ok();
    window
        .set_background_color(Some(tauri_utils::config::Color(0, 0, 0, 0)))
        .ok();
}

fn configure_mock_panel(window: &tauri::WebviewWindow) -> Result<(), String> {
    window.set_shadow(true).map_err(|e| e.to_string())?;
    window
        .set_background_color(Some(tauri_utils::config::Color(255, 255, 255, 255)))
        .map_err(|e| e.to_string())?;
    position_window_top_right(window, 20).map_err(|e| e.to_string())?;
    Ok(())
}

fn create_mock_panel(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    let window = tauri::WebviewWindowBuilder::new(
        app,
        "mock-panel",
        tauri::WebviewUrl::App("index.html#/mock-settings".into()),
    )
    .title("会盯盘的桌宠 Mock")
    .inner_size(320.0, 300.0)
    .resizable(false)
    .decorations(false)
    .transparent(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false)
    .build()
    .map_err(|e| e.to_string())?;

    configure_mock_panel(&window)?;
    Ok(window)
}

#[tauri::command]
fn open_mock_panel(app: AppHandle) -> Result<(), String> {
    let window = match app.get_webview_window("mock-panel") {
        Some(window) => window,
        None => create_mock_panel(&app)?,
    };

    configure_mock_panel(&window)?;
    window.show().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn close_mock_panel(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("mock-panel") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn is_mock_panel_open(app: AppHandle) -> bool {
    app.get_webview_window("mock-panel")
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(false)
}

// ========== 设置窗口 ==========

/// macOS 托盘应用默认 Accessory；打开设置时切 Regular 并显示 Dock 图标，便于切换器识别。
#[cfg(target_os = "macos")]
fn set_activation_for_settings(app: &AppHandle, settings_visible: bool) {
    let policy = if settings_visible {
        tauri::ActivationPolicy::Regular
    } else {
        tauri::ActivationPolicy::Accessory
    };
    let _ = app.set_activation_policy(policy);
    let _ = app.set_dock_visibility(settings_visible);
}

fn bind_settings_window_lifecycle(app: &AppHandle, window: &tauri::WebviewWindow) {
    let app_handle = app.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Destroyed = event {
            #[cfg(target_os = "macos")]
            set_activation_for_settings(&app_handle, false);
        }
    });
}

fn open_or_focus_settings(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    set_activation_for_settings(app, true);

    let icon = app.default_window_icon().cloned();

    if let Some(window) = app.get_webview_window("settings") {
        if let Some(icon) = &icon {
            window.set_icon(icon.clone()).ok();
        }
        window.show().ok();
        window.set_focus().ok();
        return;
    }

    let builder = tauri::WebviewWindowBuilder::new(
        app,
        "settings",
        tauri::WebviewUrl::App("index.html#/settings".into()),
    )
    .title("设置")
    .inner_size(560.0, 480.0)
    .center()
    .skip_taskbar(false);

    let build_result = match icon {
        Some(icon) => builder.icon(icon).and_then(|b| b.build()),
        None => builder.build(),
    };

    match build_result {
        Ok(window) => {
            bind_settings_window_lifecycle(app, &window);
            window.show().ok();
            window.set_focus().ok();
        }
        Err(e) => log::error!("open settings window failed: {e}"),
    }
}

// ========== 托盘 ==========

fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示桌宠", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide", "隐藏桌宠", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_item, &hide_item, &settings_item, &quit_item])?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .title("\u{2002}--")
        .tooltip("股票桌宠 - 加载中...")
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id.as_ref() {
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
            "settings" => open_or_focus_settings(app),
            "quit" => {
                app.exit(0);
            }
            _ => {}
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

// ========== 应用入口 ==========

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .manage(AppState {
            config: Mutex::new(load_config()),
            stocks_state: Mutex::new(Vec::new()),
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            get_stocks_state,
            search_stock,
            lookup_stock_ai,
            fetch_single_price,
            add_stock,
            update_stock,
            remove_stock,
            set_primary,
            set_display_mode,
            set_tray_display,
            get_vision_config,
            set_vision_config,
            recognize_holdings,
            refresh_prices,
            open_mock_panel,
            close_mock_panel,
            is_mock_panel_open,
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            create_tray(app.handle())?;

            let window = app.get_webview_window("main").unwrap();
            configure_pet_window(&window);

            position_window_bottom_right(&window, 20).ok();

            #[cfg(debug_assertions)]
            {
                create_mock_panel(app.handle()).ok();
            }

            start_polling(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
