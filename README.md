# Tool Hub

一个功能丰富的在线工具平台，集成了多种实用工具和经典游戏，包括中国象棋、俄罗斯方块、贪吃蛇、祖玛等游戏功能。支持响应式设计，可在各种设备上流畅运行。

🌐 [在线预览](https://tool.linger.host)

## 功能特性

### 🎮 游戏
- 中国象棋（单人/多人对战）
- 揭棋
- 俄罗斯方块
- 贪吃蛇
- 祖玛
- 拼图游戏
- 打砖块
- 泡泡龙
- 井字棋
- 吃豆人

### 🛠️ 工具
- 命名转换
- 编码转换
- 格式化工具
- 加密解密
- 文本处理
- 开发工具
- 更多工具开发中...

### 💡 系统特性
- 支持 HTTPS 安全访问
- 响应式设计，支持移动端
- 静态资源优化和缓存
- GZIP 压缩支持
- PWA 支持

## 技术栈

- **前端框架**: Vue 3
- **构建工具**: Vite
- **UI 框架**: 
  - Vuetify
  - Tailwind CSS
- **路由**: Vue Router
- **状态管理**: Pinia
- **工具库**: VueUse
- **类型支持**: TypeScript
- **部署**: Docker + Nginx

## 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker（用于生产环境部署）

## 开发环境设置

1. 克隆项目
```bash
git clone [repository-url]
cd tool-hub
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

4. 启动开发服务器
```bash
npm run dev
```

5. 运行项目校验
```bash
npm run build       # 生产构建
npm run typecheck   # Vue 与 TypeScript 类型检查
npm run lint        # ESLint 静态检查
npm run test        # Vitest 单元测试
npm run test:e2e    # Playwright 浏览器测试
npm run check       # 类型检查、Lint、单测和生产构建
```

## 生产环境部署

### 使用 Docker 部署

1. 构建 Docker 镜像
```bash
docker-compose build
```

2. 启动服务
```bash
docker-compose up -d
```

### SSL 证书配置

1. 将 SSL 证书文件放置在 `docker/nginx/cert/` 目录下：
   - `tool.linger.host.pem`
   - `tool.linger.host.key`

2. Nginx 已配置自动将 HTTP 重定向到 HTTPS

## 项目结构

```
tool-hub/
├── src/
│   ├── views/        # 页面组件
│   │   └── games/    # 游戏组件
│   ├── components/   # 通用组件
│   ├── router/       # 路由配置
│   ├── stores/       # Pinia 状态管理
│   ├── composables/  # 组合式函数
│   ├── types/        # TypeScript 类型定义
│   └── assets/       # 静态资源
├── docker/
│   └── nginx/        # Nginx 配置
├── public/           # 公共资源
└── ...配置文件
```

## 性能优化

- 静态资源缓存策略
- GZIP 压缩
- 图片懒加载
- 代码分割
- Vue 组件按需加载
- Tree-shaking
- 资源预加载

## 安全特性

- HTTPS 加密
- HTTP 自动重定向到 HTTPS
- XSS 防护
- CSRF 防护
- 安全响应头配置
- 输入验证
- 敏感信息加密

## 浏览器支持

- Chrome (最新版本)
- Firefox (最新版本)
- Safari (最新版本)
- Edge (最新版本)

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 问题反馈

如果你发现任何问题或有改进建议，请在 GitHub Issues 中提出。

## 许可证

本项目采用 [MIT 许可证](LICENSE)。这意味着你可以：

- ✅ 自由使用
- ✅ 自由复制
- ✅ 自由修改
- ✅ 自由分发
- ✅ 私人或商业用途

详细信息请查看 [LICENSE](LICENSE) 文件。 
