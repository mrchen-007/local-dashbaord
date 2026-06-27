# 🧹 清理测试数据 - 生产环境准备

## 📊 当前状态分析

### ✅ 已就绪项目
1. **数据库文件**: 无测试数据库文件（全新环境）
2. **test_data目录**: 空目录结构（3个子目录，0个文件）
3. **备份目录**: 无旧备份
4. **Python测试**: 无测试文件

### ⚠️ 需要处理的项目

#### 1. mockData保留策略
**文件**: src/risk/dataStore.ts
- ✅ **保留** generateMockProjects() 作为fallback
- **原因**: 智能降级机制，确保在数据库为空时UI不崩溃
- **流程**: 真实数据 → ETL聚合 → mockData（最后兜底）

**文件**: src/deduplication/VersionComparePage.tsx
- 📝 使用 generateMockFiles() 用于版本对比演示
- **建议**: 保留，不影响生产功能

**文件**: src/shared/etl.ts  
- 📝 注释说明："替代mockData"
- **状态**: 已是生产代码，无需修改

#### 2. test_data目录
**路径**: ./test_data/
- 当前: 3个空子目录（contracts, costs, settlements）
- **决策**: 保留目录结构，用于用户测试扫描功能
- **说明**: 用户可以放入样本文件进行初次测试

---

## ✅ 推荐的清理方案

### 方案A: 保守清理（推荐）
仅清理明确的临时文件，保留fallback机制

\\\powershell
# 1. 清理构建缓存（可选，节省空间）
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue

# 2. 清理Rust构建缓存（可选，2.3GB）
Remove-Item -Path "src-tauri/target/debug" -Recurse -Force -ErrorAction SilentlyContinue

# 3. test_data保持现状（用于用户测试）
\\\

**结果**: 
- ✅ 系统随时可用
- ✅ 数据库为空，等待用户第一次扫描
- ✅ mockData作为安全网保留
- 💾 节省约2.3GB空间（如清理Rust缓存）

---

### 方案B: 完全清理
移除所有测试相关内容

\\\powershell
# 1. 删除test_data
Remove-Item -Path "test_data" -Recurse -Force

# 2. 清理所有构建产物
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src-tauri/target" -Recurse -Force -ErrorAction SilentlyContinue

# 3. 移除mockData代码（不推荐）
# 需要手动编辑 dataStore.ts, VersionComparePage.tsx
\\\

**警告**: ❌ 不推荐完全移除mockData，会导致空数据库时UI错误

---

## 🎯 最终建议

### 当前系统已经是生产就绪状态！

**原因**:
1. ✅ 无任何测试数据库文件
2. ✅ mockData仅作为fallback，不会干扰真实数据
3. ✅ test_data是空目录，用户可自行测试
4. ✅ 所有7个Sprint优化已完成

### 需要执行的操作：

**唯一推荐清理** - 节省磁盘空间（可选）:
\\\ash
# 清理Rust debug构建（释放约2.3GB）
Remove-Item -Path "src-tauri/target/debug" -Recurse -Force
\\\

**不需要做**:
- ❌ 删除mockData代码（它是安全fallback）
- ❌ 删除test_data（用户可用于测试）
- ❌ 修改数据加载逻辑（已按生产标准实现）

---

## 📋 用户首次使用流程

1. 启动应用: \
pm run dev\
2. 点击"数据提取"页面
3. 选择要扫描的项目文件夹
4. 系统自动：
   - 扫描文件（跳过CAD/图片优先）
   - 计算哈希（持久化缓存）
   - AI解析提取数据
   - ETL聚合到projects表
   - Dashboard自动刷新显示真实数据

**首次扫描后，mockData将永不再使用**

---

## 总结

✅ **系统已经是干净的生产环境**
- 无测试数据污染
- mockData仅作安全兜底
- 等待用户首次扫描即可开始工作

唯一建议: 清理 \src-tauri/target/debug\ 释放2.3GB空间（可选）
