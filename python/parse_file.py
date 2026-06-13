#!/usr/bin/env python3
"""
工程文件解析脚本
使用 Kreuzberg 库实现文档内容提取
支持 PDF/DOCX/XLSX/图片等格式，扫描件自动 OCR
"""

import sys
import json
import os
import time
from pathlib import Path
from typing import Optional, Dict, Any

# 使用 kreuzberg 库实现文档解析
try:
    from kreuzberg import extract_file, extract_bytes
    KREUZBERG_AVAILABLE = True
except ImportError:
    KREUZBERG_AVAILABLE = False
    print(json.dumps({
        "success": False,
        "error": "kreuzberg 未安装，请运行: pip install kreuzberg"
    }))
    sys.exit(1)


def get_file_extension(file_path: str) -> str:
    """获取文件扩展名(小写)"""
    return Path(file_path).suffix.lower()


def is_supported_file(file_path: str) -> bool:
    """检查文件是否为支持的格式"""
    supported_extensions = {
        # 文档格式
        '.pdf', '.docx', '.doc', '.odt', '.rtf', '.txt',
        # 表格格式
        '.xlsx', '.xls', '.csv', '.ods',
        # 图片格式(支持OCR)
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
        # 其他格式
        '.html', '.htm', '.xml', '.json', '.md'
    }
    return get_file_extension(file_path) in supported_extensions


async def parse_document(file_path: str) -> Dict[str, Any]:
    """
    解析文档并提取文本内容
    使用 kreuzberg 库实现，支持 OCR
    
    Args:
        file_path: 文件完整路径
        
    Returns:
        包含解析结果的字典
    """
    start_time = time.time()
    
    try:
        # 检查文件是否存在
        if not os.path.exists(file_path):
            return {
                "success": False,
                "error": f"文件不存在: {file_path}"
            }
        
        # 检查文件格式
        if not is_supported_file(file_path):
            return {
                "success": False,
                "error": f"不支持的文件格式: {get_file_extension(file_path)}"
            }
        
        # 使用 kreuzberg 库提取文本内容
        # kreuzberg 会自动检测文件类型并使用相应的解析器
        # 对于图片和扫描PDF，会自动调用 OCR
        result = await extract_file(file_path)
        
        # 提取元数据
        metadata = {
            "file_path": file_path,
            "file_name": os.path.basename(file_path),
            "file_size": os.path.getsize(file_path),
            "file_extension": get_file_extension(file_path),
        }
        
        # 如果有页面信息，添加到元数据
        if hasattr(result, 'pages') and result.pages:
            metadata["page_count"] = len(result.pages)
        
        # 计算解析耗时
        duration_ms = int((time.time() - start_time) * 1000)
        
        return {
            "success": True,
            "content": result.content if hasattr(result, 'content') else str(result),
            "metadata": metadata,
            "page_count": metadata.get("page_count"),
            "parse_duration_ms": duration_ms
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"解析失败: {str(e)}",
            "parse_duration_ms": int((time.time() - start_time) * 1000)
        }


async def parse_file_from_stdin():
    """
    从标准输入读取文件路径并解析
    用于 Tauri 调用
    """
    try:
        # 从标准输入读取 JSON
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        file_path = data.get("file_path")
        
        if not file_path:
            print(json.dumps({
                "success": False,
                "error": "未提供文件路径"
            }))
            return
        
        # 解析文档
        result = await parse_document(file_path)
        print(json.dumps(result, ensure_ascii=False))
        
    except json.JSONDecodeError:
        print(json.dumps({
            "success": False,
            "error": "无效的 JSON 输入"
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))


async def parse_file_direct(file_path: str):
    """
    直接解析指定文件
    用于命令行调用
    """
    result = await parse_document(file_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    import asyncio
    
    if len(sys.argv) > 1:
        # 命令行模式：直接传入文件路径
        asyncio.run(parse_file_direct(sys.argv[1]))
    else:
        # 管道模式：从标准输入读取
        asyncio.run(parse_file_from_stdin())
