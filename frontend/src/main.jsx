import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider locale={esES} theme={{ token: { colorPrimary: '#1e293b' } }}>
      <App />
    </ConfigProvider>
  </StrictMode>,
);