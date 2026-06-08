# BP 胜率资源

这些资源从 `C:\Users\Admin\Desktop\BP胜率网站` 复制到当前项目内，避免运行和维护时依赖另一个项目目录。

## 文件

- `param_tables/output_c0.1.xlsx`
  - 来源：`BP胜率网站/data/param_tables/output_c0.1.xlsx`
  - 用途：生成 `src/data/winrateModel.ts`
  - 内容：胜率模型参数，包含 `feature` / `coefficient`

- `heroes.json`
  - 来源：`BP胜率网站/data/heroes/heroes.json`
  - 用途：生成 `src/data/heroAttributes.ts`
  - 内容：英雄数字 ID、内部名、主属性、头像路径等元数据

## 当前调用方式

应用运行时不会直接解析 `.xlsx`，而是调用已经生成好的 TypeScript 数据：

- `src/data/winrateModel.ts`
- `src/data/heroAttributes.ts`

如果资源文件更新，需要重新生成上述 TypeScript 数据文件。
