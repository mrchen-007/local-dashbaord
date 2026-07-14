// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params_from_iter, types::{Value as SqlValue, ValueRef}, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

// 文件清单结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct FileManifest {
    pub scan_time: String,
    pub folder_path: String,
    pub files: Vec<ManifestFile>,
}

// 清单中的文件信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManifestFile {
    pub path: String,
    pub size_bytes: u64,
    pub modified_time: String,
    pub hash: String,
}

// 文件信息结构体
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub modified: i64,
    pub created: i64,
    pub is_dir: bool,
    pub extension: String,
}

// 扫描结果
#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub files: Vec<FileInfo>,
    pub total_count: usize,
    pub total_size: u64,
}

// 扫描目录命令
#[tauri::command]
fn scan_directory(path: String, recursive: bool) -> Result<ScanResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err("路径不存在".to_string());
    }

    let mut files = Vec::new();
    let mut total_size = 0u64;

    let walker = if recursive {
        WalkDir::new(path).follow_links(false)
    } else {
        WalkDir::new(path).max_depth(1).follow_links(false)
    };

    let ignore_dirs = [".git", "node_modules", "target", ".backup", ".backup_old", "__pycache__", ".dedup-backups"];

    for entry in walker.into_iter().filter_entry(|entry| {
        !entry.file_type().is_dir() || !ignore_dirs.contains(&entry.file_name().to_string_lossy().as_ref())
    }).filter_map(|e| e.ok()) {

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let created = metadata
            .created()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        // 跳过目录（只处理文件）
        if metadata.is_dir() {
            continue;
        }

        let file_info = FileInfo {
            path: entry.path().to_string_lossy().to_string(),
            name: entry.file_name().to_string_lossy().to_string(),
            size: metadata.len(),
            modified,
            created,
            is_dir: metadata.is_dir(),
            extension: entry
                .path()
                .extension()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_default(),
        };

        total_size += file_info.size;
        files.push(file_info);
    }

    let total_count = files.len();

    // 写入 file_manifest.json
    let manifest_files: Vec<ManifestFile> = files.iter().map(|f| {
        let modified_dt = chrono::DateTime::from_timestamp(f.modified, 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default();
        ManifestFile {
            path: f.path.clone(),
            size_bytes: f.size,
            modified_time: modified_dt,
            hash: String::new(), // 哈希值由前端计算后通过 update_file_manifest 填充
        }
    }).collect();

    let manifest = FileManifest {
        scan_time: chrono::Utc::now().to_rfc3339(),
        folder_path: path.to_string_lossy().to_string(),
        files: manifest_files,
    };

    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("序列化 manifest 失败: {}", e))?;

    let manifest_path = path.join("file_manifest.json");
    std::fs::write(&manifest_path, manifest_json)
        .map_err(|e| format!("写入 file_manifest.json 失败: {}", e))?;

    Ok(ScanResult {
        files,
        total_count,
        total_size,
    })
}

// 更新 file_manifest.json 中指定文件的哈希值
#[tauri::command]
fn update_file_manifest(folder_path: String, file_path: String, hash: String) -> Result<(), String> {
    let manifest_path = Path::new(&folder_path).join("file_manifest.json");
    if !manifest_path.exists() {
        return Err("file_manifest.json 不存在".to_string());
    }

    let content = std::fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
    let mut manifest: FileManifest = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    if let Some(entry) = manifest.files.iter_mut().find(|f| f.path == file_path) {
        entry.hash = if hash.is_empty() { String::new() } else { format!("sha256:{}", hash) };
    }

    let json = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
    std::fs::write(&manifest_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

// 获取文件元数据命令
#[tauri::command]
fn get_file_metadata(path: String) -> Result<FileInfo, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;

    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let created = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    Ok(FileInfo {
        path: path.to_string_lossy().to_string(),
        name: path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default(),
        size: metadata.len(),
        modified,
        created,
        is_dir: metadata.is_dir(),
        extension: path
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default(),
    })
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|e| format!("打开文件失败: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 1024 * 1024];
    loop {
        let count = file.read(&mut buffer).map_err(|e| format!("读取文件失败: {e}"))?;
        if count == 0 { break; }
        hasher.update(&buffer[..count]);
    }
    Ok(hex::encode(hasher.finalize()))
}

fn write_backup_manifest(backup_path: &Path, manifest: &BackupManifest) -> Result<(), String> {
    let content = serde_json::to_string_pretty(manifest).map_err(|e| format!("序列化操作清单失败: {e}"))?;
    fs::write(backup_path.join("operation.json"), content).map_err(|e| format!("写入操作清单失败: {e}"))
}

#[tauri::command]
fn move_to_backup(files: Vec<String>, backup_dir: String) -> Result<FileOperationResult, String> {
    let backup_path = Path::new(&backup_dir);
    fs::create_dir_all(backup_path).map_err(|e| format!("创建备份目录失败: {e}"))?;
    let source_root = backup_path.parent().ok_or_else(|| "备份目录必须位于扫描根目录内".to_string())?;
    let operation_id = backup_path.file_name().and_then(|name| name.to_str()).unwrap_or("backup").to_string();
    let mut manifest = BackupManifest {
        operation_id: operation_id.clone(),
        created_at: chrono::Utc::now().to_rfc3339(),
        source_root: source_root.to_string_lossy().to_string(),
        entries: Vec::new(),
    };

    for file_path in files {
        let source = Path::new(&file_path);
        let mut item = FileOperationItem { source_path: file_path.clone(), destination_path: None, status: "failed".to_string(), error: None };
        if !source.is_file() {
            item.status = "skipped".to_string();
            item.error = Some("源文件不存在或不是常规文件".to_string());
        } else if let Ok(relative_path) = source.strip_prefix(source_root) {
            let destination = backup_path.join("files").join(relative_path);
            item.destination_path = Some(destination.to_string_lossy().to_string());
            if destination.exists() {
                item.status = "skipped".to_string();
                item.error = Some("备份目标已存在，未覆盖".to_string());
            } else if let Some(parent) = destination.parent() {
                match fs::create_dir_all(parent).and_then(|_| fs::copy(source, &destination).map(|_| ())) {
                    Ok(()) => match (sha256_file(source), sha256_file(&destination)) {
                        (Ok(source_hash), Ok(destination_hash)) if source_hash == destination_hash => match fs::remove_file(source) {
                            Ok(()) => item.status = "succeeded".to_string(),
                            Err(error) => {
                                let _ = fs::remove_file(&destination);
                                item.error = Some(format!("备份校验成功但删除源文件失败: {error}"));
                            }
                        },
                        (Ok(_), Ok(_)) => {
                            let _ = fs::remove_file(&destination);
                            item.error = Some("备份校验失败：文件哈希不一致".to_string());
                        }
                        (Err(error), _) | (_, Err(error)) => {
                            let _ = fs::remove_file(&destination);
                            item.error = Some(format!("备份校验失败: {error}"));
                        }
                    },
                    Err(error) => item.error = Some(format!("创建备份失败: {error}")),
                }
            }
        } else {
            item.status = "skipped".to_string();
            item.error = Some("源文件不在备份目录所属的扫描根目录内".to_string());
        }
        manifest.entries.push(item);
        write_backup_manifest(backup_path, &manifest)?;
    }
    Ok(FileOperationResult { operation_id, items: manifest.entries })
}

#[tauri::command]
fn restore_from_backup(backup_dir: String, files: Option<Vec<String>>, conflict_strategy: String) -> Result<FileOperationResult, String> {
    let backup_path = Path::new(&backup_dir);
    let content = fs::read_to_string(backup_path.join("operation.json")).map_err(|e| format!("读取操作清单失败: {e}"))?;
    let manifest: BackupManifest = serde_json::from_str(&content).map_err(|e| format!("解析操作清单失败: {e}"))?;
    let selected = files.unwrap_or_default();
    let mut items = Vec::new();

    for entry in manifest.entries.into_iter().filter(|entry| entry.status == "succeeded") {
        if !selected.is_empty() && !selected.contains(&entry.source_path) { continue; }
        let source = entry.destination_path.as_deref().map(Path::new).ok_or_else(|| "备份清单缺少目标路径".to_string())?;
        let destination = Path::new(&entry.source_path);
        let mut item = FileOperationItem { source_path: entry.source_path.clone(), destination_path: Some(destination.to_string_lossy().to_string()), status: "failed".to_string(), error: None };
        if !source.is_file() {
            item.status = "skipped".to_string();
            item.error = Some("备份文件不存在".to_string());
        } else {
            let mut target = destination.to_path_buf();
            if target.exists() {
                if conflict_strategy == "rename" {
                    let stem = target.file_stem().and_then(|value| value.to_str()).unwrap_or("restored");
                    let extension = target.extension().and_then(|value| value.to_str()).map(|value| format!(".{value}")).unwrap_or_default();
                    target = target.with_file_name(format!("{stem}.restored-{}{}", chrono::Utc::now().timestamp_millis(), extension));
                    item.destination_path = Some(target.to_string_lossy().to_string());
                } else {
                    item.status = "skipped".to_string();
                    item.error = Some("原路径已存在，未覆盖".to_string());
                    items.push(item);
                    continue;
                }
            }
            if let Some(parent) = target.parent() {
                match fs::create_dir_all(parent).and_then(|_| fs::copy(source, &target).map(|_| ())) {
                    Ok(()) => match (sha256_file(source), sha256_file(&target)) {
                        (Ok(left), Ok(right)) if left == right => match fs::remove_file(source) {
                            Ok(()) => item.status = "succeeded".to_string(),
                            Err(error) => item.error = Some(format!("恢复副本成功但清理备份失败: {error}")),
                        },
                        _ => {
                            let _ = fs::remove_file(&target);
                            item.error = Some("恢复校验失败".to_string());
                        }
                    },
                    Err(error) => item.error = Some(format!("恢复失败: {error}")),
                }
            }
        }
        items.push(item);
    }
    Ok(FileOperationResult { operation_id: manifest.operation_id, items })
}

// 读取文件清单命令
#[tauri::command]
fn get_manifest(folder_path: String) -> Result<FileManifest, String> {
    let manifest_path = Path::new(&folder_path).join("file_manifest.json");

    if !manifest_path.exists() {
        return Err("file_manifest.json 不存在".to_string());
    }

    let content = fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
    let manifest: FileManifest = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(manifest)
}

// 解析文件命令 - 调用 Python Kreuzberg 脚本
#[tauri::command]
fn parse_file(file_path: String) -> Result<serde_json::Value, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    // 获取 Python 脚本路径
    let script_path = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .join("python")
        .join("parse_file.py");

    if !script_path.exists() {
        return Err("parse_file.py 脚本不存在".to_string());
    }

    // 调用 Python 脚本解析文件
    let output = Command::new("python")
        .arg(&script_path)
        .arg(&file_path)
        .output()
        .map_err(|e| format!("执行 Python 脚本失败: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python 脚本执行失败: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("解析 Python 输出失败: {}", e))?;

    if !result.get("success").and_then(|value| value.as_bool()).unwrap_or(false) {
        return Err(result.get("error").and_then(|value| value.as_str()).unwrap_or("文件解析失败").to_string());
    }

    Ok(serde_json::json!({
        "file_path": file_path,
        "content": result.get("content").cloned().unwrap_or(JsonValue::String(String::new())),
        "metadata": result.get("metadata").cloned().unwrap_or(JsonValue::Object(serde_json::Map::new())),
        "duration_ms": result.get("parse_duration_ms").cloned().unwrap_or(JsonValue::from(0)),
    }))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct FileOperationItem {
    source_path: String,
    destination_path: Option<String>,
    status: String,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FileOperationResult {
    operation_id: String,
    items: Vec<FileOperationItem>,
}

#[derive(Debug, Serialize, Deserialize)]
struct BackupManifest {
    operation_id: String,
    created_at: String,
    source_root: String,
    entries: Vec<FileOperationItem>,
}

// 信息抽取命令 - 调用 SiameseUIE 服务
#[tauri::command]
fn extract_fields(file_path: String, text: String, schema: Option<Vec<String>>) -> Result<serde_json::Value, String> {
    let client = reqwest::blocking::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(5))
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("创建 UIE 客户端失败: {e}"))?;

    let default_schema = vec![
        "合同编号".to_string(),
        "合同总金额".to_string(),
        "甲方".to_string(),
        "乙方".to_string(),
        "签约日期".to_string(),
        "人工成本".to_string(),
        "材料成本".to_string(),
        "设备成本".to_string(),
        "分包金额".to_string(),
        "结算金额".to_string(),
        "结算日期".to_string(),
        "质保金比例".to_string(),
    ];

    let request_body = serde_json::json!({
        "text": text,
        "schema": schema.unwrap_or(default_schema)
    });

    let response = client
        .post("http://127.0.0.1:8000/extract")
        .json(&request_body)
        .send()
        .map_err(|e| format!("调用 UIE 服务失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("UIE 服务返回 HTTP {}", response.status()));
    }

    let result: serde_json::Value = response
        .json()
        .map_err(|e| format!("解析 UIE 响应失败: {}", e))?;

    if !result.get("success").and_then(|value| value.as_bool()).unwrap_or(false) {
        return Err(result.get("error").and_then(|value| value.as_str()).unwrap_or("字段抽取失败").to_string());
    }

    Ok(serde_json::json!({
        "file_path": file_path,
        "fields": result.get("results").cloned().unwrap_or(JsonValue::Object(serde_json::Map::new())),
        "confidence": 0.0,
        "duration_ms": result.get("duration_ms").cloned().unwrap_or(JsonValue::from(0)),
        "warnings": [],
    }))
}

// 检查 UIE 服务状态命令
#[tauri::command]
fn check_uie_service() -> Result<serde_json::Value, String> {
    let client = reqwest::blocking::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(3))
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("创建健康检查客户端失败: {e}"))?;

    let response = client
        .get("http://127.0.0.1:8000/health")
        .send()
        .map_err(|e| format!("检查 UIE 服务失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("UIE 服务返回 HTTP {}", response.status()));
    }

    let result: serde_json::Value = response
        .json()
        .map_err(|e| format!("解析 UIE 响应失败: {}", e))?;

    Ok(result)
}

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path_resolver()
        .app_data_dir()
        .ok_or_else(|| "无法确定应用数据目录".to_string())?;
    fs::create_dir_all(&data_dir).map_err(|e| format!("创建应用数据目录失败: {e}"))?;
    Ok(data_dir.join("dedup_tool.db"))
}

fn open_database(app: &tauri::AppHandle) -> Result<Connection, String> {
    let connection = Connection::open(database_path(app)?)
        .map_err(|e| format!("打开数据库失败: {e}"))?;
    connection.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;")
        .map_err(|e| format!("初始化数据库连接失败: {e}"))?;
    Ok(connection)
}

fn json_to_sql_value(value: JsonValue) -> SqlValue {
    match value {
        JsonValue::Null => SqlValue::Null,
        JsonValue::Bool(value) => SqlValue::Integer(i64::from(value)),
        JsonValue::Number(value) => value.as_i64().map(SqlValue::Integer)
            .or_else(|| value.as_f64().map(SqlValue::Real))
            .unwrap_or(SqlValue::Null),
        JsonValue::String(value) => SqlValue::Text(value),
        value => SqlValue::Text(value.to_string()),
    }
}

fn sql_value_to_json(value: ValueRef<'_>) -> JsonValue {
    match value {
        ValueRef::Null => JsonValue::Null,
        ValueRef::Integer(value) => JsonValue::from(value),
        ValueRef::Real(value) => JsonValue::from(value),
        ValueRef::Text(value) => JsonValue::from(String::from_utf8_lossy(value).to_string()),
        ValueRef::Blob(value) => JsonValue::from(hex::encode(value)),
    }
}

#[tauri::command]
fn db_execute(app: tauri::AppHandle, query: String, values: Option<Vec<JsonValue>>) -> Result<(), String> {
    let connection = open_database(&app)?;
    let values = values.unwrap_or_default().into_iter().map(json_to_sql_value).collect::<Vec<_>>();
    connection.execute(&query, params_from_iter(values))
        .map_err(|e| format!("数据库写入失败: {e}"))?;
    Ok(())
}

#[tauri::command]
fn db_select(app: tauri::AppHandle, query: String, values: Option<Vec<JsonValue>>) -> Result<Vec<JsonValue>, String> {
    let connection = open_database(&app)?;
    let values = values.unwrap_or_default().into_iter().map(json_to_sql_value).collect::<Vec<_>>();
    let mut statement = connection.prepare(&query).map_err(|e| format!("准备数据库查询失败: {e}"))?;
    let column_names = statement.column_names().iter().map(|name| (*name).to_string()).collect::<Vec<_>>();
    let rows = statement.query_map(params_from_iter(values), |row| {
        let mut object = serde_json::Map::new();
        for (index, name) in column_names.iter().enumerate() {
            object.insert(name.clone(), sql_value_to_json(row.get_ref(index)?));
        }
        Ok(JsonValue::Object(object))
    }).map_err(|e| format!("执行数据库查询失败: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("读取数据库结果失败: {e}"))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            update_file_manifest,
            get_file_metadata,
            move_to_backup,
            restore_from_backup,
            get_manifest,
            parse_file,
            extract_fields,
            check_uie_service,
            db_execute,
            db_select
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
