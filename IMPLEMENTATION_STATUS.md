# 实现状态说明

## 维护规则

本文档用于记录项目中哪些能力已经真实实现、实现方式是什么，以及哪些能力仍是 Demo 占位。

后续每次修改代码、数据结构、导入逻辑、评分逻辑或页面流程后，都必须同步检查并更新本文档，保证文档与当前实现一致。

- 最近更新时间：2026-06-08
- 当前技术形态：Vite + React + TypeScript 纯前端应用
- 旧版参考文件：`legacy-index.html`
- 当前入口文件：`index.html` -> `src/main.tsx`

## 真实实现

### 工程化前端框架

状态：已实现。

实现方法：

- 使用 `Vite` 作为开发与构建工具。
- 使用 `React` 渲染页面。
- 使用 `TypeScript` 定义核心业务类型。
- 使用 `npm run dev` 启动开发预览。
- 使用 `npm run build` 生成静态构建产物。

相关文件：

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `src/main.tsx`
- `src/App.tsx`

### 页面流程

状态：已实现。

实现方法：

- 应用包含三个主要页面：赛前配置页、BP 页、总览页。
- 页面状态由 `page` 字段控制，取值为 `setup`、`bp`、`overview`。
- 顶部栏根据当前页面、当前方案和当前 BP 手数显示状态。
- 顶部左上角 `首页` 按钮可返回主页面，点击后切回赛前配置页。
- 标题 `DOTA2 BP 交互模拟` 后提供两个 BP 页面选项：`英雄池BP界面` 和 `传统BP界面`。
- `英雄池BP界面` 是当前按我方英雄池、对方英雄池、其他英雄分组的 BP 操作界面。
- `传统BP界面` 按英雄主属性分成 `力量`、`敏捷`、`智力`、`全才` 四类，底层复用相同 BP 流程、分支、回退、分路和胜率三角逻辑。
- 传统 BP 界面中 `力量`、`敏捷`、`智力` 固定 6 列，`全才` 固定 4 列，四个板块使用统一头像尺寸和顶部对齐；传统界面头像宽度使用 `clamp()` 随可用屏幕空间自适应，最大 80px，避免整体缩放导致的大面积空白。
- 传统 BP 界面的属性分类和排序来自项目内 `resources/bp-winrate/heroes.json`，生成到 `src/data/heroAttributes.ts`。

相关文件：

- `src/App.tsx`
- `src/components/Topbar.tsx`
- `src/pages/SetupPage.tsx`
- `src/pages/DraftPage.tsx`
- `src/pages/OverviewPage.tsx`
- `src/store/useDraftStore.ts`
- `src/types.ts`
- `src/data/heroAttributes.ts`
- `resources/bp-winrate/heroes.json`
- `scripts/generate-bp-winrate-data.cjs`

### BP 顺序与轮次推进

状态：已实现。

实现方法：

- `DRAFT_SEQUENCE` 定义 24 手 Ban/Pick 顺序。
- `getDraftTurn()` 根据当前步骤、我方阵营、先后手计算执行方。
- `selectHeroInPlan()` 在当前方案中追加一步 Ban/Pick。
- 已被当前方案 Ban/Pick 的英雄不可再次选择。
- 达到 24 手后不会继续追加新步骤。

相关文件：

- `src/data/dotaData.ts`
- `src/domain/draft.ts`
- `src/domain/draft.test.ts`

### 回退与撤销

状态：已实现。

实现方法：

- `cancelFromStep()` 会删除目标步骤及其之后所有步骤。
- 回退时会同步清理不再存在英雄的分路分配。
- `undoLastStep()` 基于 `cancelFromStep()` 删除最后一步。

相关文件：

- `src/domain/draft.ts`
- `src/store/useDraftStore.ts`
- `src/pages/DraftPage.tsx`
- `src/domain/draft.test.ts`

### 多方案分支

状态：已实现。

实现方法：

- `createBranchFromPlan()` 复制当前方案的步骤和分路配置。
- 新方案使用新的 `planId`，并切换为当前激活方案。
- 分支数据使用新对象，避免修改一个分支时污染源分支。

相关文件：

- `src/domain/plans.ts`
- `src/store/useDraftStore.ts`
- `src/pages/DraftPage.tsx`
- `src/domain/draft.test.ts`

### 分路分配与拖拽调整

状态：已实现。

实现方法：

- Pick 英雄后根据英雄池中的最高权重位置推断默认分路。
- 如果英雄池中找不到该英雄，则根据英雄自身 `roles` 推断默认分路。
- 2 号位进入中路，1/5 号位进入优势路，其他默认进入劣势路。
- BP 页支持拖拽已 Pick 英雄到其他分路。
- 天辉与夜魇的三路展示顺序按阵营镜像处理。

相关文件：

- `src/domain/lanes.ts`
- `src/pages/DraftPage.tsx`
- `src/types.ts`

### 英雄数据与英雄池构建

状态：已实现。

实现方法：

- 从旧 Demo 抽离英雄基础数据、战队预置英雄池和 7.41 赛事英雄池。
- `buildPoolData()` 根据战队 ID 构建英雄池。
- `buildPoolFromRaw()` 将原始分层数据转换成 UI 可用的 `HeroPool`。
- `buildOtherHeroPool()` 根据 7.41 赛事池生成“其他英雄”，并排除我方英雄池中已有英雄。

相关文件：

- `src/data/dotaData.ts`
- `src/domain/heroes.ts`
- `src/types.ts`

### Excel / CSV 英雄池导入

状态：已实现基础版本。

实现方法：

- 支持 `.xlsx`、`.xls`、`.csv` 文件。
- Excel 使用 `xlsx` 解析首个工作表。
- CSV 使用 `papaparse` 解析。
- 支持字段别名：
  - 英雄名：`英雄名`、`英雄`、`hero`、`heroName`、`name`
  - 常用位置：`常用位置`、`位置`、`role`、`position`、`pos`
  - 优先级：`优先级`、`评级`、`tier`、`priority`
- 常用位置必须为 `1` 到 `5`。
- 导入成功后将对应战队切换为 `CUSTOM`。

相关文件：

- `src/importers/poolImporter.ts`
- `src/importers/poolImporter.test.ts`
- `src/pages/SetupPage.tsx`
- `src/store/useDraftStore.ts`

### 总览页方案对比

状态：已实现。

实现方法：

- 总览页遍历所有方案。
- 每个方案按优势路、中路、劣势路生成对位组合。
- 总览页只展示三路对位关系、方案完成度和 Pick 数。
- 按产品要求，已删除对线评分、优势/劣势标签和对线期综合分。

相关文件：

- `src/pages/OverviewPage.tsx`
- `src/domain/lanes.ts`

### 英雄红绿三角胜率影响标记

状态：已实现。

实现方法：

- 使用项目内 `resources/bp-winrate/param_tables/output_c0.1.xlsx` 参数表，该文件复制自 `BP胜率网站/data/param_tables/output_c0.1.xlsx`。
- 读取参数表中的 `feature` / `coefficient`：
  - `hero_x`：单英雄系数；
  - `hero_xchero_y`：同阵营组合系数；
  - `hero_<a>xhero_<b>`：敌我交叉组合系数；
  - `radiant`：天辉基础偏置。
- 通过项目内 `resources/bp-winrate/heroes.json` 将数字英雄 ID 映射为当前项目使用的 Dota 内部英雄 ID，该文件复制自 `BP胜率网站/data/heroes/heroes.json`。
- 在前端生成 `src/data/winrateModel.ts`，纯前端计算无需后端服务。
- 可通过 `npm run generate:bp-data` 从项目内资源重新生成 `src/data/winrateModel.ts` 和 `src/data/heroAttributes.ts`。
- `evaluateDraftWinrate()` 按模型系数累加 logit 分数，并使用 sigmoid 转换为天辉胜率。
- `pickImpactLevel()` 在 Pick 回合模拟“当前候选英雄被当前轮次阵营选下”后的新胜率。
- 以我方视角计算 `deltaMyWinrate`：
  - 正值显示绿色上三角；
  - 负值显示红色下三角；
  - 小于 2% 不显示；
  - 2% 到 5% 显示 1 个；
  - 5% 到 10% 显示 2 个；
  - 大于 10% 显示 3 个。

相关文件：

- `src/data/winrateModel.ts`
- `resources/bp-winrate/param_tables/output_c0.1.xlsx`
- `resources/bp-winrate/heroes.json`
- `scripts/generate-bp-winrate-data.cjs`
- `src/domain/evaluation.ts`
- `src/pages/DraftPage.tsx`
- `src/domain/draft.test.ts`

注意：

- 该能力的计算方法与模型系数是真实接入，不再是随机 Demo。
- 当前显示的是“该候选英雄对我方胜率的边际影响”，不是直接解释具体克制原因。
- 解释型“为什么克制/为什么被克制”仍需要后续做贡献拆解 UI。

### 本地草稿持久化

状态：已实现。

实现方法：

- 使用浏览器 `localStorage` 保存本地 BP 草稿。
- 保存内容包含：
  - 当前页面；
  - 当前 BP 界面模式；
  - 赛前配置；
  - 上传文件名与导入提示；
  - 自定义英雄池；
  - 当前激活方案 ID；
  - 下一方案 ID；
  - 所有 BP 方案、步骤和分路分配。
- 保存数据带 `version` 和 `savedAt`，便于后续做数据迁移。
- 应用启动时调用 `loadDraftState()` 自动恢复草稿。
- 非配置页恢复时，会根据 `config + customPools` 重新构建 `pools`，避免保存冗余或过期池数据。
- BP 操作、界面模式切换、分支切换、回退、拖拽分路、导入英雄池、配置变更后会自动保存。
- 配置页提供“清除本地草稿”按钮，清除后恢复默认初始状态。

相关文件：

- `src/persistence/draftStorage.ts`
- `src/persistence/draftStorage.test.ts`
- `src/store/useDraftStore.ts`
- `src/pages/SetupPage.tsx`

### 自动化测试

状态：已实现基础覆盖。

实现方法：

- 使用 `Vitest`。
- 已覆盖：
  - BP 执行方计算；
  - 同方案英雄去重；
  - 从指定步骤回退；
  - 分支隔离；
  - 模型胜率计算和候选 Pick 影响值；
  - 本地草稿保存、恢复和清除；
  - CSV 导入成功；
  - CSV 缺字段错误提示。

相关文件：

- `src/domain/draft.test.ts`
- `src/importers/poolImporter.test.ts`
- `src/persistence/draftStorage.test.ts`
- `src/test/setup.ts`

## Demo 占位

### 预置战队英雄池

状态：部分真实、部分 Demo。

当前实现：

- XG、VG 有明确预置池。
- 其他战队目前走生成池逻辑。

为什么是部分占位：

- FALCONS、LIQUID、SPIRIT 尚未接入真实战队英雄池。
- 生成池仅用于保证 UI 有内容展示。

相关文件：

- `src/data/dotaData.ts`
- `src/domain/heroes.ts`

后续真实实现方向：

- 为每支战队维护真实英雄池数据。
- 给数据增加来源、版本、更新时间。
- 支持从导入文件覆盖或合并。

### 7.41 赛事池数据来源

状态：Demo 数据内置。

当前实现：

- `REAL_741_POOL_NAMES` 内置在前端数据文件中。
- “其他英雄”从该池生成。

为什么仍需完善：

- 数据没有外部来源记录。
- 无自动更新机制。
- 无版本管理或数据校验。

相关文件：

- `src/data/dotaData.ts`
- `src/domain/heroes.ts`

后续真实实现方向：

- 将赛事池拆成独立数据文件。
- 记录数据来源和版本。
- 增加导入或替换机制。

### 端到端测试

状态：未实现。

当前情况：

- 已有核心单元测试。
- 尚未接入 Playwright 端到端测试。

后续真实实现方向：

- 覆盖完整 24 手 BP。
- 覆盖回退重选。
- 覆盖创建多个分支并进入总览。
- 覆盖上传 CSV 后进入 BP。

## 当前验证状态

最近一次验证：

- `npm run generate:bp-data`：通过。
- `npm test`：通过。
- `npm run build`：通过。
- IDE 诊断：无 linter 错误。
- 最近测试覆盖：3 个测试文件，9 个用例。

注意事项：

- 构建时可能出现 chunk 超过 500KB 的提示，主要来自 `xlsx` 依赖和内置胜率模型系数。
- 当前生产 JS 约 1.1MB，gzip 后约 310.7KB。
- 该提示不影响功能。
- 后续可通过动态导入 Excel 解析模块、压缩/懒加载模型系数优化首包大小。

## 后续维护检查清单

每次修改后，请检查：

- 是否新增了真实功能，需要加入“真实实现”章节。
- 是否新增了临时逻辑、假数据或演示算法，需要加入“Demo 占位”章节。
- 是否修改了实现文件路径，需要同步更新“相关文件”。
- 是否改变了验证结果，需要更新“当前验证状态”。
- 是否引入新的限制或风险，需要写入对应说明。
