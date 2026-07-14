# 🚀 快速启动指南

## 前置要求

- Node.js >= 18
- Rust >= 1.70
- Python >= 3.9 (用于AI模型)

## 安装步骤

### 1. 安装依赖

```bash
# 前端依赖
npm install

# Python/AI 服务（自动创建项目级 .venv 并等待模型就绪）
powershell -ExecutionPolicy Bypass -File start_services.ps1
```

### 2. 启动开发服务器

```bash
# 方式1：Vite开发服务器（浏览器预览）
npm run dev

# 方式2：Tauri桌面应用（推荐）
npm run tauri:dev
```

### 3. 启动Python服务（可选，用于AI提取）

```powershell
# Windows PowerShell
.\start_services.ps1
```

## 使用流程

### 阶段一：文件去重
1. 侧边栏选择"文件去重"
2. 点击"选择"按钮，选择项目文件夹
3. 配置匹配模式（推荐：双维度匹配）
4. 点击"开始扫描"
5. 预览删除结果（Dry-Run）
6. 确认后移动到备份

### 阶段二：数据提取
1. 侧边栏选择"数据提取"
2. 加载file_manifest.json
3. 点击"开始提取"
4. 等待AI模型解析文档
5. 查看提取结果

### 阶段三：风险看板
1. 侧边栏选择"项目总览"
2. 自动加载SQLite数据
3. 查看风险统计和项目列表
4. 点击"查看详情"进入单项目分析
5. 导出Word/Excel报告

## 常见问题

### Q: Dashboard 显示空数据？
**A**: 当前版本只使用已确认字段生成正式项目数据。请在“数据提取”完成处理后，在“字段人工复核”中确认关键字段，再返回看板刷新。可在“运行诊断”检查待复核数量和数据库完整性。

### Q: 扫描大量文件时卡顿？
**A**: 已优化为批量更新（每100个文件更新一次进度），应该不会卡顿。如仍有问题，检查是否使用了旧版本代码。

### Q: 哈希计算很慢？
**A**: 首次计算后会缓存到SQLite，第二次会直接读取缓存。检查files表中file_hash字段是否有值。

### Q: 备份后如何恢复？
**A**: 备份目录保存 `operation.json` 和原始相对目录结构。恢复时默认跳过已存在的原路径，避免覆盖用户后续修改。

### Q: CAD图纸为什么排在前面？
**A**: 已在Sprint 3修复，重新编译后CAD/图片会排在最后。

## 数据库查看

```bash
# 使用SQLite工具查看
sqlite3 dedup_tool.db

# 查看表结构
.schema

# 查看projects表
SELECT * FROM projects;

# 查看extracted_fields表
SELECT * FROM extracted_fields LIMIT 10;
```

## 调试技巧

### 诊断运行状态
从侧边栏打开“运行诊断”，可检查桌面环境、AI 模型状态、SQLite 完整性、外键异常和待复核字段数量。

### 清空数据重新开始
```typescript
// 在浏览器Console中执行
const { databaseService } = await import('./shared/database');
await databaseService.clearAll();
location.reload();
```

## 性能监控

### 扫描性能
性能指标需以 `tests/golden-sample` 中的脱敏真实样本实测为准；当前不对未验证的文件规模或耗时作承诺。

### 内存使用
- 空闲时 < 200MB
- 扫描时 < 500MB
- AI模型加载 < 1GB

---

**提示**: 首次使用建议先用小型项目测试（< 1000个文件），熟悉流程后再处理大型项目。
