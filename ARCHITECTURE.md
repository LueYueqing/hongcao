# Hongcao 网站管理系统 - 系统架构设计

## 📋 项目概述

Hongcao 是一个综合性网站管理系统，专为管理大量网站并提供SEO分析功能而设计。

### 核心功能
- 🌐 **网站管理**: 集中管理公司的多个网站
- 📊 **关键词报表**: 导入和分析搜索引擎关键词数据
- 🔍 **竞品分析**: 分析竞争对手的关键词策略

## 🏗️ 系统架构

### 整体架构图
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用层     │    │   API网关层     │    │   微服务层       │
│                 │    │                 │    │                 │
│ • React Admin   │◄──►│ • Nginx/Kong    │◄──►│ • 网站管理服务   │
│ • Dashboard     │    │ • 负载均衡       │    │ • 关键词服务     │
│ • 数据可视化     │    │ • 限流/鉴权     │    │ • 竞品分析服务   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             │
                       │   数据处理层     │◄────────────┘
                       │                 │
                       │ • ETL处理       │
                       │ • 数据清洗       │
                       │ • 定时任务       │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   数据存储层     │
                       │                 │
                       │ • MySQL主库     │
                       │ • Redis缓存     │
                       │ • ClickHouse    │
                       │ • 文件存储       │
                       └─────────────────┘
```

## 🛠️ 技术栈选择

### 前端技术栈
- **框架**: React 18 + TypeScript
- **UI库**: Ant Design / Material-UI
- **状态管理**: Redux Toolkit / Zustand
- **数据可视化**: ECharts / Chart.js
- **构建工具**: Vite
- **包管理**: pnpm

### 后端技术栈
- **主框架**: Node.js + Express / Fastify
- **数据库ORM**: Prisma / TypeORM
- **认证授权**: JWT + Passport.js
- **API文档**: Swagger/OpenAPI
- **消息队列**: Redis + Bull
- **定时任务**: node-cron

### 数据库设计
- **主数据库**: MySQL 8.0 (网站信息、用户数据)
- **缓存层**: Redis (会话、热点数据)
- **分析数据库**: ClickHouse (大量关键词数据)
- **文件存储**: MinIO / AWS S3

### 基础设施
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **监控**: Prometheus + Grafana
- **日志**: ELK Stack
- **CI/CD**: GitHub Actions

## 📊 数据流架构

### 数据采集流程
```
搜索引擎API ──┐
             ├──► 数据采集服务 ──► 数据清洗 ──► 数据存储 ──► 分析服务
竞品网站 ────┘
```

### 实时数据处理
```
用户操作 ──► API网关 ──► 业务服务 ──► 缓存更新 ──► 数据库写入
                    │
                    └──► WebSocket ──► 前端实时更新
```

## 🔧 核心服务模块

### 1. 网站管理服务 (Website Management Service)
```typescript
interface WebsiteService {
  // 网站CRUD操作
  createWebsite(data: WebsiteData): Promise<Website>
  updateWebsite(id: string, data: Partial<WebsiteData>): Promise<Website>
  deleteWebsite(id: string): Promise<void>
  getWebsites(filters: WebsiteFilters): Promise<Website[]>
  
  // 网站监控
  monitorWebsite(id: string): Promise<WebsiteStatus>
  getWebsiteAnalytics(id: string, period: DateRange): Promise<Analytics>
}
```

### 2. 关键词服务 (Keyword Service)
```typescript
interface KeywordService {
  // 关键词数据导入
  importKeywordReport(file: File, source: SearchEngine): Promise<ImportResult>
  
  // 关键词分析
  analyzeKeywords(websiteId: string, filters: KeywordFilters): Promise<KeywordAnalysis>
  getKeywordTrends(keywords: string[], period: DateRange): Promise<TrendData>
  
  // 排名监控
  trackKeywordRankings(websiteId: string, keywords: string[]): Promise<void>
}
```

### 3. 竞品分析服务 (Competitor Analysis Service)
```typescript
interface CompetitorService {
  // 竞品管理
  addCompetitor(websiteId: string, competitorUrl: string): Promise<Competitor>
  
  // 关键词对比
  compareKeywords(websiteId: string, competitorId: string): Promise<ComparisonResult>
  
  // 竞品监控
  monitorCompetitor(competitorId: string): Promise<CompetitorData>
}
```

## 🗄️ 数据库设计概览

### 核心表结构
```sql
-- 网站表
CREATE TABLE websites (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive', 'maintenance'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 关键词表
CREATE TABLE keywords (
    id VARCHAR(36) PRIMARY KEY,
    website_id VARCHAR(36),
    keyword VARCHAR(500) NOT NULL,
    search_volume INT,
    difficulty DECIMAL(3,2),
    cpc DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES websites(id)
);

-- 排名记录表
CREATE TABLE keyword_rankings (
    id VARCHAR(36) PRIMARY KEY,
    keyword_id VARCHAR(36),
    website_id VARCHAR(36),
    search_engine ENUM('google', 'baidu', 'bing'),
    position INT,
    url TEXT,
    recorded_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id),
    FOREIGN KEY (website_id) REFERENCES websites(id)
);
```

## 🔐 安全设计

### 认证授权
- JWT Token 认证
- RBAC 角色权限控制
- API 访问频率限制
- HTTPS 强制加密

### 数据安全
- 数据库连接加密
- 敏感数据字段加密存储
- 定期数据备份
- 访问日志审计

## 📈 性能优化

### 缓存策略
- Redis 缓存热点数据
- CDN 静态资源加速
- 数据库查询优化
- 分页和虚拟滚动

### 扩展性设计
- 微服务架构便于水平扩展
- 数据库读写分离
- 消息队列异步处理
- 负载均衡多实例部署

## 🚀 部署方案

### 开发环境
```bash
# 使用 Docker Compose 一键启动
docker-compose -f docker-compose.dev.yml up -d
```

### 生产环境
- 使用 Kubernetes 集群部署
- 自动扩缩容配置
- 健康检查和故障恢复
- 蓝绿部署策略

## 📋 开发计划

### Phase 1: 基础功能 (4周)
- [ ] 用户认证系统
- [ ] 网站管理CRUD
- [ ] 基础Dashboard

### Phase 2: 关键词功能 (6周)
- [ ] 关键词数据导入
- [ ] 关键词分析报表
- [ ] 排名监控功能

### Phase 3: 竞品分析 (4周)
- [ ] 竞品网站管理
- [ ] 关键词对比分析
- [ ] 竞品监控报警

### Phase 4: 优化完善 (2周)
- [ ] 性能优化
- [ ] 用户体验改进
- [ ] 部署上线

---

**文档版本**: v1.0  
**最后更新**: 2025-09-16  
**维护者**: 开发团队
