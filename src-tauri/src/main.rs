// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            get_file_metadata,
            move_to_backup,
            restore_from_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
