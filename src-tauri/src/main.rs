// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
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
        WalkDir::new(path).follow_links(true)
    } else {
        WalkDir::new(path).max_depth(1).follow_links(true)
    };

    for entry in walker.into_iter().filter_map(|e| e.ok()) {
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

    Ok(ScanResult {
        files,
        total_count,
        total_size,
    })
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

// 移动文件到备份目录命令
#[tauri::command]
fn move_to_backup(files: Vec<String>, backup_dir: String) -> Result<Vec<String>, String> {
    let backup_path = Path::new(&backup_dir);
    fs::create_dir_all(backup_path).map_err(|e| e.to_string())?;

    let mut moved_files = Vec::new();

    for file_path in files {
        let source = Path::new(&file_path);
        if !source.exists() {
            continue;
        }

        let file_name = source.file_name().unwrap().to_string_lossy();
        let timestamp = chrono::Utc::now().timestamp();
        let dest = backup_path.join(format!("{}_{}", timestamp, file_name));

        fs::copy(source, &dest).map_err(|e| e.to_string())?;
        fs::remove_file(source).map_err(|e| e.to_string())?;

        moved_files.push(dest.to_string_lossy().to_string());
    }

    Ok(moved_files)
}

// 从备份恢复文件命令
#[tauri::command]
fn restore_from_backup(backup_files: Vec<String>, original_dir: String) -> Result<Vec<String>, String> {
    let original_path = Path::new(&original_dir);
    let mut restored_files = Vec::new();

    for backup_file in backup_files {
        let backup = Path::new(&backup_file);
        if !backup.exists() {
            continue;
        }

        let file_name = backup.file_name().unwrap().to_string_lossy();
        // 移除时间戳前缀
        let original_name = file_name.split('_').skip(1).collect::<Vec<&str>>().join("_");
        let dest = original_path.join(&original_name);

        fs::copy(backup, &dest).map_err(|e| e.to_string())?;
        fs::remove_file(backup).map_err(|e| e.to_string())?;

        restored_files.push(dest.to_string_lossy().to_string());
    }

    Ok(restored_files)
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

    Ok(result)
}

// 信息抽取命令 - 调用 SiameseUIE 服务
#[tauri::command]
fn extract_fields(text: String, schema: Option<Vec<String>>) -> Result<serde_json::Value, String> {
    let client = reqwest::blocking::Client::new();

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

    let result: serde_json::Value = response
        .json()
        .map_err(|e| format!("解析 UIE 响应失败: {}", e))?;

    Ok(result)
}

// 检查 UIE 服务状态命令
#[tauri::command]
fn check_uie_service() -> Result<serde_json::Value, String> {
    let client = reqwest::blocking::Client::new();

    let response = client
        .get("http://127.0.0.1:8000/health")
        .send()
        .map_err(|e| format!("检查 UIE 服务失败: {}", e))?;

    let result: serde_json::Value = response
        .json()
        .map_err(|e| format!("解析 UIE 响应失败: {}", e))?;

    Ok(result)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            get_file_metadata,
            move_to_backup,
            restore_from_backup,
            get_manifest,
            parse_file,
            extract_fields,
            check_uie_service
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
