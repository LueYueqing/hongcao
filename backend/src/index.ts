import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import Queue from 'bull';

// 导入路由
import authRoutes from './routes/auth';
import websiteRoutes from './routes/websites';
import keywordRoutes from './routes/keywords';
import competitorRoutes from './routes/competitors';
import sslRoutes from './routes/ssl';
import analyticsRoutes from './routes/analytics';

// 导入中间件
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';

// 导入配置
import config from './config';

// 全局声明
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    queues: {
      keywordTracking: Queue.Queue;
      sslMonitoring: Queue.Queue;
      dataImport: Queue.Queue;
    };
  }
}

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// 创建队列
const keywordTrackingQueue = new Queue('keyword tracking', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});

const sslMonitoringQueue = new Queue('ssl monitoring', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});

const dataImportQueue = new Queue('data import', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});

async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: config.app.logLevel,
      prettyPrint: config.app.env === 'development',
    },
  });

  // 注册插件
  await server.register(helmet);
  await server.register(cors, {
    origin: config.app.corsOrigin,
    credentials: true,
  });

  await server.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.expiresIn,
    },
  });

  await server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Swagger 文档
  await server.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Hongcao API',
        description: 'Hongcao 网站管理系统 API 文档',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${config.app.port}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await server.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
  });

  // 装饰器 - 添加数据库和Redis连接
  server.decorate('prisma', prisma);
  server.decorate('redis', redis);
  server.decorate('queues', {
    keywordTracking: keywordTrackingQueue,
    sslMonitoring: sslMonitoringQueue,
    dataImport: dataImportQueue,
  });

  // 注册中间件
  server.register(authMiddleware);
  server.register(errorHandler);

  // 健康检查
  server.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await redis.ping();
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        redis: 'connected',
      };
    } catch (error) {
      server.log.error('Health check failed:', error);
      throw server.httpErrors.serviceUnavailable('Service temporarily unavailable');
    }
  });

  // 注册路由
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(websiteRoutes, { prefix: '/api/websites' });
  await server.register(keywordRoutes, { prefix: '/api/keywords' });
  await server.register(competitorRoutes, { prefix: '/api/competitors' });
  await server.register(sslRoutes, { prefix: '/api/ssl' });
  await server.register(analyticsRoutes, { prefix: '/api/analytics' });

  // 全局错误处理
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Something went wrong',
    });
  });

  return server;
}

async function start() {
  try {
    const server = await buildServer();
    
    // 连接数据库
    await prisma.$connect();
    server.log.info('Database connected');

    // 测试Redis连接
    await redis.ping();
    server.log.info('Redis connected');

    // 启动服务器
    await server.listen({
      port: config.app.port,
      host: config.app.host,
    });

    server.log.info(`Server is running on http://${config.app.host}:${config.app.port}`);
    server.log.info(`API documentation available at http://${config.app.host}:${config.app.port}/docs`);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  await redis.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  await redis.disconnect();
  process.exit(0);
});

if (require.main === module) {
  start();
}

export { buildServer };
