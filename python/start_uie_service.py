#!/usr/bin/env python3
"""
SiameseUIE 本地服务启动脚本
使用 SiameseUIE 中文-base 模型进行信息抽取
CPU 运行，无需 GPU
"""

import sys
import json
import os
import time
import signal
import logging
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("uie_service")

# 使用 FastAPI 构建 HTTP 服务
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    logger.error("fastapi/uvicorn 未安装，请运行: pip install fastapi uvicorn")
    sys.exit(1)

# 使用 transformers 加载 SiameseUIE 模型
try:
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.error("transformers/torch 未安装，请运行: pip install transformers torch")
    sys.exit(1)


# 定义请求模型
class ExtractionRequest(BaseModel):
    text: str
    schema: List[str] = [
        "合同编号", "合同总金额", "甲方", "乙方", "签约日期",
        "人工成本", "材料成本", "设备成本", "分包金额",
        "结算金额", "结算日期", "质保金比例"
    ]


class ExtractionResponse(BaseModel):
    success: bool
    results: Dict[str, Any] = {}
    error: Optional[str] = None
    duration_ms: int = 0


# 全局模型变量
model = None
tokenizer = None
model_name = "SiameseUIE/siamese-uie-chinese-base"


def load_model():
    """加载 SiameseUIE 模型"""
    global model, tokenizer
    
    logger.info(f"正在加载模型: {model_name}")
    start_time = time.time()
    
    try:
        # 使用 transformers 库加载模型和分词器
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        
        # 设置为评估模式
        model.eval()
        
        # 如果有 GPU 则使用 GPU
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = model.to(device)
        
        logger.info(f"模型加载完成，耗时: {time.time() - start_time:.2f}秒，设备: {device}")
        return True
        
    except Exception as e:
        logger.error(f"模型加载失败: {e}")
        return False


def extract_entities(text: str, schema: List[str]) -> Dict[str, Any]:
    """
    使用 SiameseUIE 抽取实体
    基于提示的抽取方式
    
    Args:
        text: 输入文本
        schema: 要抽取的字段列表
        
    Returns:
        抽取结果字典
    """
    global model, tokenizer
    
    if model is None or tokenizer is None:
        raise RuntimeError("模型未加载")
    
    results = {}
    device = next(model.parameters()).device
    
    for field in schema:
        try:
            # 构造抽取提示
            prompt = f"抽取以下文本中的{field}信息：{text[:500]}"
            
            # 使用 tokenizer 编码
            inputs = tokenizer(
                prompt,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True
            ).to(device)
            
            # 使用模型生成
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_length=128,
                    num_beams=4,
                    early_stopping=True
                )
            
            # 解码结果
            extracted = tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            if extracted and extracted.strip():
                results[field] = extracted.strip()
                
        except Exception as e:
            logger.warning(f"抽取{field}失败: {e}")
            results[field] = None
    
    return results


# 创建 FastAPI 应用
app = FastAPI(title="SiameseUIE 本地服务")

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """应用启动时加载模型"""
    success = load_model()
    if not success:
        logger.error("模型加载失败，服务可能无法正常工作")


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_name": model_name
    }


@app.post("/extract", response_model=ExtractionResponse)
async def extract(request: ExtractionRequest):
    """
    信息抽取接口
    
    接收文本和抽取 schema，返回抽取结果
    """
    start_time = time.time()
    
    try:
        if model is None:
            raise HTTPException(status_code=503, detail="模型未加载")
        
        # 执行抽取
        results = extract_entities(request.text, request.schema)
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        return ExtractionResponse(
            success=True,
            results=results,
            duration_ms=duration_ms
        )
        
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return ExtractionResponse(
            success=False,
            error=str(e),
            duration_ms=duration_ms
        )


@app.post("/extract_batch")
async def extract_batch(texts: List[Dict[str, Any]]):
    """
    批量抽取接口
    
    接收多个文本和 schema，返回抽取结果列表
    """
    results = []
    for item in texts:
        text = item.get("text", "")
        schema = item.get("schema", [
            "合同编号", "合同总金额", "甲方", "乙方", "签约日期",
            "人工成本", "材料成本", "设备成本", "分包金额",
            "结算金额", "结算日期", "质保金比例"
        ])
        
        start_time = time.time()
        try:
            extracted = extract_entities(text, schema)
            results.append({
                "success": True,
                "results": extracted,
                "duration_ms": int((time.time() - start_time) * 1000)
            })
        except Exception as e:
            results.append({
                "success": False,
                "error": str(e),
                "duration_ms": int((time.time() - start_time) * 1000)
            })
    
    return {"results": results}


def main():
    """启动服务"""
    import argparse
    
    parser = argparse.ArgumentParser(description="SiameseUIE 本地服务")
    parser.add_argument("--host", default="127.0.0.1", help="监听地址")
    parser.add_argument("--port", type=int, default=8000, help="监听端口")
    parser.add_argument("--reload", action="store_true", help="自动重载")
    
    args = parser.parse_args()
    
    logger.info(f"启动 SiameseUIE 服务: {args.host}:{args.port}")
    
    # 使用 uvicorn 启动服务
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        reload=args.reload
    )


if __name__ == "__main__":
    main()
