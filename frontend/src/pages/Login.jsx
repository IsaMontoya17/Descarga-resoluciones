import { useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { Icon } from '@iconify/react';
import { login } from '../api/client';

const { Title, Text } = Typography;

function Login({ onLoginExitoso }) {
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit({ usuario, password }) {
    setError('');
    setCargando(true);

    try {
      const data = await login(usuario, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      onLoginExitoso(data.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <Card style={{ width: 380 }}>
        <Title level={4} style={{ marginBottom: 0 }}>Gerencia de Catastro</Title>
        <Text type="secondary">Gobernación de Antioquia — Descarga de resoluciones</Text>

        {error && <Alert type="error" message={error} showIcon style={{ marginTop: 16 }} />}

        <Form layout="vertical" onFinish={manejarSubmit} style={{ marginTop: 20 }}>
          <Form.Item label="Usuario" name="usuario" rules={[{ required: true, message: 'Ingresa tu usuario' }]}>
            <Input prefix={<Icon icon="mdi:account-outline" />} size="large" />
          </Form.Item>

          <Form.Item label="Contraseña" name="password" rules={[{ required: true, message: 'Ingresa tu contraseña' }]}>
            <Input.Password prefix={<Icon icon="mdi:lock-outline" />} size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={cargando} block size="large">
            Iniciar sesión
          </Button>
        </Form>
      </Card>
    </div>
  );
}

export default Login;