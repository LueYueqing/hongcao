import React from 'react';
import { Row, Col, Card, Statistic, Typography, Space, Progress, List, Tag } from 'antd';
import { 
  GlobalOutlined, 
  SearchOutlined, 
  SafetyCertificateOutlined,
  TrendingUpOutlined,
  WarningOutlined 
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  // 模拟数据
  const websiteStats = {
    total: 128,
    active: 125,
    inactive: 3,
    ssl_expiring: 12
  };

  const keywordStats = {
    total: 15420,
    top10: 2340,
    top50: 8920,
    declining: 156
  };

  // 排名趋势图表配置
  const rankingTrendOption = {
    title: {
      text: '关键词排名趋势',
      left: 'left',
      textStyle: { fontSize: 16 }
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      top: 30,
      data: ['Top 10', 'Top 50', '总关键词']
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Top 10',
        type: 'line',
        data: [2100, 2200, 2150, 2300, 2250, 2340],
        smooth: true,
        itemStyle: { color: '#52c41a' }
      },
      {
        name: 'Top 50',
        type: 'line',
        data: [8200, 8400, 8300, 8600, 8750, 8920],
        smooth: true,
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '总关键词',
        type: 'line',
        data: [14800, 14900, 15100, 15200, 15300, 15420],
        smooth: true,
        itemStyle: { color: '#722ed1' }
      }
    ]
  };

  // 网站流量分布
  const trafficDistributionOption = {
    title: {
      text: '流量来源分布',
      left: 'left',
      textStyle: { fontSize: 16 }
    },
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        type: 'pie',
        radius: '50%',
        data: [
          { value: 45, name: '有机搜索' },
          { value: 25, name: '直接访问' },
          { value: 15, name: '社交媒体' },
          { value: 10, name: '付费广告' },
          { value: 5, name: '其他' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  const recentAlerts = [
    { id: 1, type: 'ssl', message: 'example.com SSL证书将在7天后过期', time: '2小时前' },
    { id: 2, type: 'ranking', message: '关键词"网站管理"排名下降至第15位', time: '4小时前' },
    { id: 3, type: 'competitor', message: '竞品competitor.com新增50个关键词', time: '6小时前' },
    { id: 4, type: 'ssl', message: 'shop.example.com SSL证书将在3天后过期', time: '1天前' },
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'ssl':
        return <SafetyCertificateOutlined style={{ color: '#ff4d4f' }} />;
      case 'ranking':
        return <TrendingUpOutlined style={{ color: '#faad14' }} />;
      case 'competitor':
        return <WarningOutlined style={{ color: '#1890ff' }} />;
      default:
        return <WarningOutlined />;
    }
  };

  const getAlertTag = (type: string) => {
    const tagMap = {
      ssl: { color: 'red', text: 'SSL' },
      ranking: { color: 'orange', text: '排名' },
      competitor: { color: 'blue', text: '竞品' }
    };
    const tag = tagMap[type as keyof typeof tagMap] || { color: 'default', text: '其他' };
    return <Tag color={tag.color}>{tag.text}</Tag>;
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>仪表盘</Title>
      
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="网站总数"
              value={websiteStats.total}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">活跃: {websiteStats.active}</Text>
              <Text type="secondary" style={{ marginLeft: 16 }}>
                停用: {websiteStats.inactive}
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="关键词总数"
              value={keywordStats.total}
              prefix={<SearchOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Top 10: {keywordStats.top10}</Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="SSL证书预警"
              value={websiteStats.ssl_expiring}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="danger">需要关注</Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="排名下降"
              value={keywordStats.declining}
              prefix={<TrendingUpOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="warning">本周</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card>
            <ReactECharts option={rankingTrendOption} style={{ height: 350 }} />
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card>
            <ReactECharts option={trafficDistributionOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      {/* 最近警告 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="最近警告" extra={<a href="#">查看全部</a>}>
            <List
              dataSource={recentAlerts}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={getAlertIcon(item.type)}
                    title={
                      <Space>
                        {getAlertTag(item.type)}
                        <span>{item.message}</span>
                      </Space>
                    }
                    description={item.time}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="系统状态">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>数据库连接</Text>
                <Progress 
                  percent={100} 
                  size="small" 
                  status="success" 
                  style={{ marginLeft: 16, width: 200 }} 
                />
              </div>
              <div>
                <Text>缓存服务</Text>
                <Progress 
                  percent={95} 
                  size="small" 
                  style={{ marginLeft: 16, width: 200 }} 
                />
              </div>
              <div>
                <Text>API响应时间</Text>
                <Progress 
                  percent={88} 
                  size="small" 
                  style={{ marginLeft: 16, width: 200 }} 
                />
              </div>
              <div>
                <Text>磁盘使用率</Text>
                <Progress 
                  percent={45} 
                  size="small" 
                  style={{ marginLeft: 16, width: 200 }} 
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
