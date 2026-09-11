# Tool Hub Frontend Guidelines

本文件适用于 `tool-hub/`。同时遵守仓库根目录 `AGENTS.md`。

## 技术栈与目录

- Vue 3、TypeScript、Vite、Vuetify、Vue Router、Pinia；依赖和命令以 `package.json` 为准。
- `src/views/`：按领域组织页面；`src/components/`：共享组件；`src/composables/`、`src/hooks/`：复用逻辑。
- `src/api/`：领域 API；底层请求统一通过 `src/utils/request.ts`。
- `src/router/index.ts`：路由和导航元数据；`src/components/AppNavigation.vue`：导航分组。
- 本目录是独立 Git 工作区；检查状态和差异时使用 `git -C tool-hub ...` 或先进入本目录。

## 页面与交互

- 新页面补全 `title`、`description`、`icon`、`keywords`、`featured` 等已有路由元数据。
- 只有需要登录的页面设置 `requiresAuth: true`；公开只读工具保持公开。
- 工具页优先使用 `ToolPageLayout`。布局已显示标题时不重复写 `<h1>`；全屏工作区使用 `:card="false"`。
- 优先使用 Vuetify、Material Design Icons 和现有成熟组件，不重复实现已有基础交互。
- 股票图表、编辑器、地图、拖拽、虚拟表格等复杂能力优先使用成熟库，并遵循相应领域惯例。
- 保持内部工具风格：信息紧凑、层级清楚、边框克制、操作直接，避免营销式首屏和装饰性渐变。

## 状态、API 与类型

- 页面组件不直接散落 Axios 调用；在 `src/api/` 定义明确的请求和响应类型，并复用 `request.ts`。
- 以后端 Controller/Route 及 DTO/Schema 为接口契约。接口变化时用 `rg` 查找 API 方法和路径的全部调用点。
- 查询区间和集合按后端类型组装；全部为空时传 `undefined`，不发送空字符串、`[null, null]` 或无效占位数组。
- 搜索重置同时清空页面局部状态、组件状态和最终请求参数，避免旧条件残留。
- 跨页面状态放 Pinia，共享行为放 composable/hook；不要复制同一业务逻辑到多个页面。

## 样式

- 优先复用 `src/main.css` 的颜色、间距、圆角、阴影变量和公共类，不硬编码新的颜色体系或创建一次性视觉系统。
- 避免添加会覆盖 Vuetify 的全局 `button`、`input`、`textarea` 样式。
- 沿用现有 TypeScript、Vue 和 CSS 格式，不对无关文件做批量格式化。

## 验证

可用命令如下，是否执行由任务范围决定：

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

- 默认只做相关文件的静态核对和必要的定向单元测试，不运行完整 `check`、全量构建或端到端测试。
- 除非用户明确要求，不启动开发服务器、不打开 localhost、不运行浏览器自动化、不截图验收。
- 修改工具函数时优先运行对应的 Vitest 测试文件；修改路由时静态核对路由元数据和 `AppNavigation.vue`。
- 交付时列出建议的关键手工验证步骤，尤其是权限、上传、流式聊天、图表和复杂编辑器交互。
