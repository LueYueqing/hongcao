import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import WebsiteList from './pages/Website/WebsiteList';
import WebsiteDetail from './pages/Website/WebsiteDetail';
import KeywordAnalysis from './pages/Keyword/KeywordAnalysis';
import CompetitorAnalysis from './pages/Competitor/CompetitorAnalysis';
import SSLMonitor from './pages/SSL/SSLMonitor';
import Settings from './pages/Settings';

import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/websites" element={<WebsiteList />} />
              <Route path="/websites/:id" element={<WebsiteDetail />} />
              <Route path="/keywords" element={<KeywordAnalysis />} />
              <Route path="/competitors" element={<CompetitorAnalysis />} />
              <Route path="/ssl-monitor" element={<SSLMonitor />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </Router>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
