# CodeGate 项目待办事项清单

> **文档说明**：本文档列出 CodeGate 项目的待办事项，按照优先级排序。
> 
> **相关文档**：
> - 功能需求请参考 [`docs/design/project.md`](./design/project.md)
> - 界面规范请参考 [`docs/design/ui_prd.md`](./design/ui_prd.md)
> - 组件样式请参考 [`docs/design/ui_components.md`](./design/ui_components.md)
> - 通用规范请参考 [`docs/design/ui_prd_default.md`](./design/ui_prd_default.md)
> 
> **状态**：🔴 未实现 | 🟡 部分实现

## 中优先级

### 1. 激活码加密存储
**状态**: 🟡 部分实现（可选功能）  
**内容**: 激活码哈希存储选项  
**参考文档**: `project.md` 第 3.6 节（安全功能）

**功能说明**：
- 可选的对激活码进行哈希存储
- 增强安全性

## 低优先级

### 2. 前端测试
**状态**: 🔴 未实现  
**参考文档**: `project.md` 第 7 节（测试要求）

**功能说明**：
- 测试关键用户交互流程
- 测试页面功能和组件

### 3. 测试覆盖率提升
**状态**: 🟡 部分实现  
**目标**: 80% 以上覆盖率  
**参考文档**: `project.md` 第 5.4 节（测试要求）

**功能说明**：
- 核心业务逻辑测试覆盖率应达到 80% 以上
- 单元测试覆盖所有服务和工具函数
- 集成测试测试 API 端点的完整流程

---

## UI 组件规范检查

### 组件样式规范（参考 `ui_components.md`）
- ⚠️ 确保所有按钮组件符合 `ui_components.md` 第 2 章规范
- ⚠️ 确保所有弹框组件符合 `ui_components.md` 第 3 章规范
- ⚠️ 确保所有 Toast 通知符合 `ui_components.md` 第 4 章规范
- ⚠️ 确保所有表单组件符合 `ui_components.md` 第 5 章规范
- ⚠️ 确保所有表格组件符合 `ui_components.md` 第 6 章规范
- ⚠️ 确保所有 Badge 组件符合 `ui_components.md` 第 7 章规范

### 页面规范检查（参考 `ui_prd.md`）
- ⚠️ 确保所有页面符合 `ui_prd.md` 页面详细规范
- ⚠️ 确保页面布局符合 CodeGate 项目特定布局规范（左右布局）
- ⚠️ 确保页面交互符合 `ui_prd.md` 交互规范

---

## 文档更新

- ✅ 已根据最新设计文档更新待办事项清单
- ✅ 已添加对设计文档的引用
- ✅ 已添加 UI 组件规范检查项
- ✅ 已在设计文档中增加单个激活码操作说明（`code_status_logic.md` 第 6 章）
  - 单个激活码禁用操作：`PUT /api/codes/{code_id}`，仅针对"未使用且未过期"的激活码
  - 单个激活码启用操作：`PUT /api/codes/{code_id}`，仅针对"已禁用"的激活码
  - 保持现有禁用、启用逻辑不变，与批量操作逻辑完全一致
