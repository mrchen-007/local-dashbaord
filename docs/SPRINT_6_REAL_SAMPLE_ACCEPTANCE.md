# Sprint 6 真实脱敏样本验收记录

## 样本

- 目录：`D:\02.chenwenke2024\09.联营项目\019榆横工业区废渣处置场三期项目一阶段工程施工`
- 处理方式：只读递归扫描；未修改样本源文件。
- 可复现命令：

```powershell
python scripts/run-sprint6-sample.py "D:\02.chenwenke2024\09.联营项目\019榆横工业区废渣处置场三期项目一阶段工程施工" --output tests/golden-sample/actual.json
npm.cmd run verify:golden
```

## 解析证据

| 状态 | 数量 | 说明 |
|---|---:|---|
| success | 100 | PDF、DOC/DOCX、XLS/XLSX、TXT、MD、JSON 等通过现有 Kreuzberg 解析器 |
| failed | 5 | 3 个图片因当前环境未注册 `tesseract` OCR 后端；2 个 `~$` 临时 XLSX 是无效 ZIP |
| unsupported | 40 | DWG、GBQ6、压缩包、SXTB、LOG 和无扩展名文件按不支持格式保留 |
| total | 145 | 与样本实际递归文件数一致 |

逐文件错误和不支持清单保存在 `tests/golden-sample/actual.json`，用于复核和回归比较。解析器没有将失败或不支持文件伪装成成功。

## 当前闭环状态

已验证：真实目录读取、格式分流、逐文件解析、部分失败统计、错误原因持久化到验收证据、黄金样本契约校验。

尚未在本轮无头环境中验证：通过桌面 UI 创建项目并写入 SQLite、绑定目录后的 Rust 扫描任务、字段抽取服务健康检查、人工确认字段、台账/风险重建、Excel/Word 报告导出及 `report_exports` 审计记录。因此 `expected.json` 明确保留 `projects.count=0`、`database_e2e_verified=false` 和 `report_exports.e2e_verified=false`，不能据此宣称完整业务闭环已完成。

## 后续整改项

1. 在可启动 Tauri 窗口的环境执行一次项目创建→绑定→扫描→解析→复核→台账→风险→报告导出，并把数据库统计和导出元数据补入黄金断言。
2. 为图片 OCR 配置并健康检查 `paddle-ocr` 或注册 `tesseract`，保留不可用时的逐文件失败提示。
3. 对 DWG、GBQ6、SXTB 和压缩包明确产品策略：接入专用解析器、先解包后扫描，或在 UI 中标为“需外部工具”。
4. 对 `~$*.xlsx` 临时文件增加扫描忽略规则，避免把 Office 锁文件作为业务文档解析。
5. 安装包、升级迁移、卸载和干净机器验证仍属于发布验收，不在本次样本解析证据范围内。
