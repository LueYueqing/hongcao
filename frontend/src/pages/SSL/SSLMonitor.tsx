import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Input, 
  Select, 
  DatePicker,
  Progress,
  Tooltip,
  Alert,
  Modal,
  Form,
  message
} from 'antd';
import { 
  SafetyCertificateOutlined, 
  ReloadOutlined, 
  ExportOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface SSLCertificate {
  id: string;
  domain: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  status: 'valid' | 'expiring' | 'expired' | 'invalid';
  lastChecked: string;
}

const SSLMonitor: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 模拟SSL证书数据
  const sslData: SSLCertificate[] = [
    {
      id: '1',
      domain: 'example.com',
      issuer: 'Let\'s Encrypt',
      validFrom: '2024-01-15',
      validTo: '2024-04-15',
      daysRemaining: 45,
      status: 'valid',
      lastChecked: '2024-03-01 10:30'
    },
    {
      id: '2',
      domain: 'shop.example.com',
      issuer: 'DigiCert',
      validFrom: '2023-12-01',
      validTo: '2024-03-10',
      daysRemaining: 7,
      status: 'expiring',
      lastChecked: '2024-03-01 10:32'
    },
    {
      id: '3',
      domain: 'api.example.com',
      issuer: 'GlobalSign',
      validFrom: '2023-06-01',
      validTo: '2024-02-28',
      daysRemaining: -2,
      status: 'expired',
      lastChecked: '2024-03-01 10:28'
    },
    {
      id: '4',
      domain: 'blog.example.com',
      issuer: 'Let\'s Encrypt',
      validFrom: '2024-01-20',
      validTo: '2024-04-20',
      daysRemaining: 50,
      status: 'valid',
      lastChecked: '2024-03-01 10:35'
    },
    {
      id: '5',
      domain: 'cdn.example.com',
      issuer: 'CloudFlare',
      validFrom: '2024-02-01',
      validTo: '2024-05-01',
      daysRemaining: 61,
      status: 'valid',
      lastChecked: '2024-03-01 10:40'
    }
  ];

  const getStatusTag = (status: string, daysRemaining: number) => {
    if (status === 'expired') {
      return <Tag color="red" icon={<CloseCircleOutlined />}>已过期</Tag>;
    } else if (status === 'expiring' || daysRemaining <= 15) {
      return <Tag color="orange" icon={<WarningOutlined />}>即将过期</Tag>;
    } else if (status === 'valid') {
      return <Tag color="green" icon={<CheckCircleOutlined />}>有效</Tag>;
    } else {
      return <Tag color="red" icon={<CloseCircleOutlined />}>无效</Tag>;
    }
  };

  const getDaysRemainingColor = (days: number) => {
    if (days <= 0) return '#ff4d4f';
    if (days <= 7) return '#faad14';
    if (days <= 30) return '#faad14';
    return '#52c41a';
  };

  const columns: ColumnsType<SSLCertificate> = [
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      render: (domain: string) => (
        <Space>
          <SafetyCertificateOutlined />
          <Text strong>{domain}</Text>
        </Space>
      ),
      sorter: (a, b) => a.domain.localeCompare(b.domain),
    },
    {
      title: '颁发机构',
      dataIndex: 'issuer',
      key: 'issuer',
      filters: [
        { text: 'Let\'s Encrypt', value: 'Let\'s Encrypt' },
        { text: 'DigiCert', value: 'DigiCert' },
        { text: 'GlobalSign', value: 'GlobalSign' },
        { text: 'CloudFlare', value: 'CloudFlare' },
      ],
      onFilter: (value, record) => record.issuer === value,
    },
    {
      title: '有效期',
      key: 'validity',
      render: (_, record) => (
        <div>
          <div>{record.validFrom}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>至 {record.validTo}</div>
        </div>
      ),
    },
    {
      title: '剩余天数',
      dataIndex: 'daysRemaining',
      key: 'daysRemaining',
      render: (days: number) => (
        <div>
          <Text style={{ color: getDaysRemainingColor(days), fontWeight: 'bold' }}>
            {days > 0 ? `${days} 天` : `过期 ${Math.abs(days)} 天`}
          </Text>
          {days > 0 && days <= 30 && (
            <div style={{ marginTop: 4 }}>
              <Progress
                percent={Math.max(0, (days / 90) * 100)}
                size="small"
                strokeColor={getDaysRemainingColor(days)}
                showInfo={false}
              />
            </div>
          )}
        </div>
      ),
      sorter: (a, b) => a.daysRemaining - b.daysRemaining,
      defaultSortOrder: 'ascend',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record) => getStatusTag(status, record.daysRemaining),
      filters: [
        { text: '有效', value: 'valid' },
        { text: '即将过期', value: 'expiring' },
        { text: '已过期', value: 'expired' },
        { text: '无效', value: 'invalid' },
      ],
      onFilter: (value, record) => {
        if (value === 'expiring') {
          return record.status === 'expiring' || record.daysRemaining <= 15;
        }
        return record.status === value;
      },
    },
    {
      title: '最后检查',
      dataIndex: 'lastChecked',
      key: 'lastChecked',
      render: (time: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>{time}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="立即检查">
            <Button 
              type="link" 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={() => handleCheckSSL(record.id)}
            />
          </Tooltip>
          <Button type="link" size="small">详情</Button>
        </Space>
      ),
    },
  ];

  const handleCheckSSL = async (id?: string) => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setLoading(false);
      message.success(id ? '证书检查完成' : '批量检查完成');
    }, 2000);
  };

  const handleBatchCheck = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要检查的证书');
      return;
    }
    handleCheckSSL();
  };

  const handleExport = () => {
    message.success('导出成功');
  };

  const handleAddDomain = async (values: any) => {
    try {
      // 模拟API调用
      console.log('添加域名:', values);
      message.success('域名添加成功，正在检查SSL证书...');
      setAddModalVisible(false);
      form.resetFields();
      // 触发列表刷新
    } catch (error) {
      message.error('添加失败');
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  // 统计数据
  const stats = {
    total: sslData.length,
    valid: sslData.filter(item => item.status === 'valid' && item.daysRemaining > 15).length,
    expiring: sslData.filter(item => item.daysRemaining <= 15 && item.daysRemaining > 0).length,
    expired: sslData.filter(item => item.daysRemaining <= 0).length,
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 16 }}>SSL证书监控</Title>
      
      {/* 警告提示 */}
      {stats.expired > 0 && (
        <Alert
          message={`发现 ${stats.expired} 个已过期证书`}
          description="请立即更新这些证书以确保网站安全访问"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {stats.expiring > 0 && (
        <Alert
          message={`${stats.expiring} 个证书即将过期`}
          description="建议在证书过期前15天进行续签操作"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 统计卡片 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{stats.total}</div>
            <div style={{ color: '#666' }}>总证书数</div>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{stats.valid}</div>
            <div style={{ color: '#666' }}>正常证书</div>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>{stats.expiring}</div>
            <div style={{ color: '#666' }}>即将过期</div>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>{stats.expired}</div>
            <div style={{ color: '#666' }}>已过期</div>
          </div>
        </Card>
      </div>

      <Card>
        {/* 工具栏 */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Search placeholder="搜索域名" style={{ width: 200 }} />
            <Select placeholder="选择状态" style={{ width: 120 }} allowClear>
              <Option value="valid">有效</Option>
              <Option value="expiring">即将过期</Option>
              <Option value="expired">已过期</Option>
            </Select>
            <RangePicker placeholder={['开始日期', '结束日期']} />
          </Space>
          
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setAddModalVisible(true)}
            >
              添加域名
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleBatchCheck}
              disabled={selectedRowKeys.length === 0}
            >
              批量检查
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出报告
            </Button>
          </Space>
        </div>

        {/* 表格 */}
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={sslData}
          rowKey="id"
          loading={loading}
          pagination={{
            total: sslData.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
        />
      </Card>

      {/* 添加域名弹窗 */}
      <Modal
        title="添加SSL监控域名"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddDomain}
        >
          <Form.Item
            name="domains"
            label="域名列表"
            rules={[{ required: true, message: '请输入域名' }]}
          >
            <Input.TextArea
              rows={6}
              placeholder="请输入域名，每行一个：&#10;example.com&#10;www.example.com&#10;api.example.com"
            />
          </Form.Item>
          <Form.Item
            name="checkInterval"
            label="检查频率"
            initialValue="daily"
          >
            <Select>
              <Option value="hourly">每小时</Option>
              <Option value="daily">每天</Option>
              <Option value="weekly">每周</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="alertDays"
            label="提前预警天数"
            initialValue={15}
          >
            <Select>
              <Option value={7}>7天</Option>
              <Option value={15}>15天</Option>
              <Option value={30}>30天</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SSLMonitor;
