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

# Python依赖（AI模型）
cd python
pip install -r requirements.txt
cd ..
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

### Q: Dashboard显示空数据？
**A**: 检查是否完成数据提取流程。查看控制台日志：
```
[DataStore] projects表为空，尝试运行ETL聚合...
[DataStore] ⚠ extracted_fields表也为空，请先运行数据提取流程
```

### Q: 扫描大量文件时卡顿？
**A**: 已优化为批量更新（每100个文件更新一次进度），应该不会卡顿。如仍有问题，检查是否使用了旧版本代码。

### Q: 哈希计算很慢？
**A**: 首次计算后会缓存到SQLite，第二次会直接读取缓存。检查files表中file_hash字段是否有值。

### Q: 备份后如何恢复？
**A**: 点击"从备份恢复"按钮，选择备份目录（格式：.backup_时间戳），确认恢复。

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

### 启用详细日志
打开浏览器开发者工具（F12），查看Console面板：
- `[DataStore]` - 数据加载日志
- `[DatabaseService]` - 数据库操作日志
- `[PersistentHashCache]` - 哈希缓存日志
- `[SmartPolling]` - 热更新日志

### 清空数据重新开始
```typescript
// 在浏览器Console中执行
const { databaseService } = await import('./shared/database');
await databaseService.clearAll();
location.reload();
```

## 性能监控

### 扫描性能
- 10万文件 < 5分钟 ✅
- 哈希缓存命中率 > 80% ✅
- UI响应时间 < 100ms ✅

### 内存使用
- 空闲时 < 200MB
- 扫描时 < 500MB
- AI模型加载 < 1GB

---

**提示**: 首次使用建议先用小型项目测试（< 1000个文件），熟悉流程后再处理大型项目。
