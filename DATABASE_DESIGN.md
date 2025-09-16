# Hongcao 网站管理系统 - 数据库设计文档

## 📊 数据库架构概览

### 数据库分层设计
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   业务数据层     │    │   分析数据层     │    │   缓存数据层     │
│                 │    │                 │    │                 │
│   MySQL 8.0     │    │  ClickHouse     │    │    Redis 7.0    │
│                 │    │                 │    │                 │
│ • 用户数据       │    │ • 关键词数据     │    │ • 会话缓存       │
│ • 网站信息       │    │ • 排名历史       │    │ • 查询缓存       │
│ • 基础配置       │    │ • 分析报表       │    │ • 热点数据       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🗄️ MySQL 主数据库设计

### 用户和权限管理

#### 用户表 (users)
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 角色表 (roles)
```sql
CREATE TABLE roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSON,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 用户角色关联表 (user_roles)
```sql
CREATE TABLE user_roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    role_id VARCHAR(36) NOT NULL,
    assigned_by VARCHAR(36),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY uk_user_role (user_id, role_id),
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 网站管理

#### 网站表 (websites)
```sql
CREATE TABLE websites (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    protocol ENUM('http', 'https') DEFAULT 'https',
    description TEXT,
    category VARCHAR(100),
    language VARCHAR(10) DEFAULT 'zh-CN',
    country VARCHAR(10) DEFAULT 'CN',
    status ENUM('active', 'inactive', 'maintenance', 'suspended') DEFAULT 'active',
    owner_id VARCHAR(36) NOT NULL,
    
    -- SEO配置
    google_analytics_id VARCHAR(50),
    google_search_console_verified BOOLEAN DEFAULT FALSE,
    baidu_site_verification VARCHAR(100),
    
    -- 监控配置
    monitor_enabled BOOLEAN DEFAULT TRUE,
    monitor_frequency INT DEFAULT 60, -- 分钟
    
    -- 元数据
    metadata JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_domain (domain),
    INDEX idx_owner_id (owner_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 网站用户权限表 (website_permissions)
```sql
CREATE TABLE website_permissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    website_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    permission_level ENUM('owner', 'admin', 'editor', 'viewer') NOT NULL,
    granted_by VARCHAR(36),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY uk_website_user (website_id, user_id),
    INDEX idx_website_id (website_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 关键词管理

#### 关键词表 (keywords)
```sql
CREATE TABLE keywords (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    keyword VARCHAR(500) NOT NULL,
    website_id VARCHAR(36) NOT NULL,
    
    -- 关键词属性
    search_volume INT DEFAULT 0,
    difficulty DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    cpc DECIMAL(10,2) DEFAULT 0.00,
    competition ENUM('low', 'medium', 'high') DEFAULT 'medium',
    
    -- 分类标签
    category VARCHAR(100),
    tags JSON,
    
    -- 监控配置
    track_enabled BOOLEAN DEFAULT TRUE,
    target_position INT DEFAULT 10,
    
    -- 状态
    status ENUM('active', 'paused', 'archived') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
    
    INDEX idx_keyword (keyword),
    INDEX idx_website_id (website_id),
    INDEX idx_search_volume (search_volume),
    INDEX idx_difficulty (difficulty),
    INDEX idx_status (status),
    INDEX idx_category (category),
    
    FULLTEXT KEY ft_keyword (keyword)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 关键词排名表 (keyword_rankings)
```sql
CREATE TABLE keyword_rankings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    keyword_id VARCHAR(36) NOT NULL,
    website_id VARCHAR(36) NOT NULL,
    search_engine ENUM('google', 'baidu', 'bing', 'yahoo') NOT NULL,
    device ENUM('desktop', 'mobile') DEFAULT 'desktop',
    location VARCHAR(100) DEFAULT 'global',
    
    -- 排名数据
    position INT,
    url TEXT,
    title VARCHAR(500),
    description TEXT,
    
    -- 竞争数据
    total_results BIGINT,
    featured_snippet BOOLEAN DEFAULT FALSE,
    
    -- 记录时间
    recorded_date DATE NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE,
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_keyword_ranking (keyword_id, search_engine, device, location, recorded_date),
    INDEX idx_keyword_id (keyword_id),
    INDEX idx_website_id (website_id),
    INDEX idx_search_engine (search_engine),
    INDEX idx_position (position),
    INDEX idx_recorded_date (recorded_date),
    INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 竞品分析

#### 竞品网站表 (competitors)
```sql
CREATE TABLE competitors (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    website_id VARCHAR(36) NOT NULL, -- 关联的自有网站
    
    -- 竞品信息
    description TEXT,
    category VARCHAR(100),
    estimated_traffic BIGINT,
    domain_authority DECIMAL(5,2),
    
    -- 监控配置
    monitor_enabled BOOLEAN DEFAULT TRUE,
    monitor_frequency INT DEFAULT 1440, -- 分钟，默认每天
    
    -- 状态
    status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
    
    INDEX idx_domain (domain),
    INDEX idx_website_id (website_id),
    INDEX idx_status (status),
    INDEX idx_estimated_traffic (estimated_traffic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 竞品关键词表 (competitor_keywords)
```sql
CREATE TABLE competitor_keywords (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    competitor_id VARCHAR(36) NOT NULL,
    keyword VARCHAR(500) NOT NULL,
    
    -- 排名数据
    position INT,
    search_engine ENUM('google', 'baidu', 'bing') DEFAULT 'google',
    url TEXT,
    
    -- 流量估算
    estimated_traffic INT DEFAULT 0,
    search_volume INT DEFAULT 0,
    
    -- 发现时间
    first_seen DATE,
    last_seen DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE,
    
    INDEX idx_competitor_id (competitor_id),
    INDEX idx_keyword (keyword),
    INDEX idx_position (position),
    INDEX idx_search_volume (search_volume),
    INDEX idx_last_seen (last_seen),
    
    FULLTEXT KEY ft_keyword (keyword)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 数据导入和任务管理

#### 导入任务表 (import_jobs)
```sql
CREATE TABLE import_jobs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    website_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    
    -- 任务信息
    job_type ENUM('keyword_report', 'ranking_data', 'competitor_data') NOT NULL,
    source ENUM('google_search_console', 'baidu_tongji', 'semrush', 'ahrefs', 'manual_upload') NOT NULL,
    
    -- 文件信息
    file_name VARCHAR(255),
    file_size BIGINT,
    file_path VARCHAR(500),
    
    -- 处理状态
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    progress INT DEFAULT 0, -- 0-100
    
    -- 处理结果
    total_records INT DEFAULT 0,
    processed_records INT DEFAULT 0,
    error_records INT DEFAULT 0,
    error_message TEXT,
    
    -- 时间戳
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_website_id (website_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_job_type (job_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 系统配置和日志

#### 系统配置表 (system_configs)
```sql
CREATE TABLE system_configs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_config_key (config_key),
    INDEX idx_is_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 操作日志表 (audit_logs)
```sql
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(36),
    
    -- 操作详情
    old_values JSON,
    new_values JSON,
    
    -- 请求信息
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_resource_type (resource_type),
    INDEX idx_resource_id (resource_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 📈 ClickHouse 分析数据库设计

### 关键词分析表
```sql
CREATE TABLE keyword_analytics (
    date Date,
    website_id String,
    keyword String,
    search_engine String,
    device String,
    
    -- 排名数据
    position UInt16,
    impressions UInt64,
    clicks UInt64,
    ctr Float64,
    
    -- 流量数据
    sessions UInt64,
    bounce_rate Float64,
    avg_session_duration UInt32,
    
    -- 转化数据
    conversions UInt32,
    conversion_rate Float64,
    revenue Float64,
    
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (website_id, keyword, date, search_engine)
SETTINGS index_granularity = 8192;
```

### 网站流量分析表
```sql
CREATE TABLE website_analytics (
    date Date,
    website_id String,
    
    -- 流量指标
    pageviews UInt64,
    unique_visitors UInt64,
    sessions UInt64,
    bounce_rate Float64,
    avg_session_duration UInt32,
    
    -- 来源分析
    organic_traffic UInt64,
    direct_traffic UInt64,
    referral_traffic UInt64,
    social_traffic UInt64,
    
    -- 设备分析
    desktop_sessions UInt64,
    mobile_sessions UInt64,
    tablet_sessions UInt64,
    
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (website_id, date)
SETTINGS index_granularity = 8192;
```

## 🔄 Redis 缓存设计

### 缓存策略
```redis
# 用户会话缓存
session:{session_id} -> {user_data}  # TTL: 7天

# 网站数据缓存
website:{website_id} -> {website_data}  # TTL: 1小时

# 关键词排名缓存
ranking:{website_id}:{date} -> {ranking_data}  # TTL: 6小时

# 查询结果缓存
query:{hash} -> {result_data}  # TTL: 30分钟

# 热点数据缓存
hot:keywords:{website_id} -> {keyword_list}  # TTL: 1小时
hot:competitors:{website_id} -> {competitor_list}  # TTL: 2小时

# 计数器
counter:api_calls:{user_id}:{date} -> {count}  # TTL: 1天
counter:imports:{website_id}:{date} -> {count}  # TTL: 1天

# 任务队列
queue:keyword_tracking -> {job_data}
queue:data_import -> {job_data}
queue:report_generation -> {job_data}
```

## 🔧 数据库优化策略

### 索引优化
1. **主键索引**: 使用UUID作为主键，分布式友好
2. **复合索引**: 根据查询模式创建复合索引
3. **全文索引**: 关键词搜索使用全文索引
4. **分区索引**: ClickHouse按时间分区

### 查询优化
1. **读写分离**: 主从复制，读操作分流
2. **分页查询**: 使用游标分页，避免深度分页
3. **批量操作**: 批量插入和更新，减少连接开销
4. **查询缓存**: Redis缓存热点查询结果

### 存储优化
1. **数据压缩**: ClickHouse自动压缩历史数据
2. **数据归档**: 定期归档老旧数据
3. **分库分表**: 大表按网站ID分表
4. **冷热分离**: 热数据SSD，冷数据HDD

## 📊 数据备份和恢复

### 备份策略
```bash
# MySQL 全量备份（每日）
mysqldump --single-transaction --routines --triggers hongcao > backup_$(date +%Y%m%d).sql

# MySQL 增量备份（每小时）
mysqlbinlog --start-datetime="$(date -d '1 hour ago' '+%Y-%m-%d %H:00:00')" > incremental_$(date +%Y%m%d_%H).sql

# Redis 备份
redis-cli --rdb backup_$(date +%Y%m%d).rdb

# ClickHouse 备份
clickhouse-backup create backup_$(date +%Y%m%d)
```

### 恢复策略
1. **RTO目标**: 1小时内恢复服务
2. **RPO目标**: 数据丢失不超过15分钟
3. **灾备方案**: 异地备份，主备切换
4. **测试计划**: 每月进行恢复测试

## 📋 数据库监控

### 性能监控指标
- **连接数**: 当前连接数/最大连接数
- **查询性能**: 慢查询日志，执行计划分析
- **资源使用**: CPU、内存、磁盘IO
- **缓存命中率**: Redis缓存命中率
- **复制延迟**: 主从复制延迟时间

### 告警规则
```yaml
# MySQL 监控告警
- 连接数超过80%
- 慢查询数量异常
- 主从复制延迟 > 10秒
- 磁盘空间使用率 > 85%

# Redis 监控告警  
- 内存使用率 > 90%
- 缓存命中率 < 85%
- 连接数异常增长

# ClickHouse 监控告警
- 查询响应时间 > 5秒
- 磁盘写入异常
- 分区数量异常
```

---

**文档版本**: v1.0  
**最后更新**: 2025-09-16  
**数据库负责人**: DBA团队
