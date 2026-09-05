import { useState } from 'react';
import { Layout, Button, Space, Typography, Avatar } from 'antd';
import { Icon } from '@iconify/react';
import Login from './pages/Login';
import PanelEjecucion from './pages/PanelEjecucion';
import PanelMonitoreo from './pages/PanelMonitoreo';
import PanelAdministracion from './pages/PanelAdministracion';
import PanelHistorial from './pages/PanelHistorial';

const { Header, Content } = Layout;
const { Text } = Typography;

function App() {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  const [ejecucionActual, setEjecucionActual] = useState(() => {
    const guardada = localStorage.getItem('ejecucionActual');
    return guardada ? JSON.parse(guardada) : null;
  });

  // 'principal'  = flujo normal (PanelEjecucion / PanelMonitoreo)
  // 'admin'      = Panel de Administración de correos por municipio (RF-24)
  // 'historial'  = Panel de Historial de ejecuciones (RF-22/23)
  const [vista, setVista] = useState('principal');

  function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  function manejarEjecucionIniciada(id, mes, anio) {
    const nueva = { id, mes, anio };
    localStorage.setItem('ejecucionActual', JSON.stringify(nueva));
    setEjecucionActual(nueva);
  }

  function limpiarEjecucion() {
    localStorage.removeItem('ejecucionActual');
    setEjecucionActual(null);
  }

  if (!usuario) {
    return <Login onLoginExitoso={setUsuario} />;
  }

  const esAdministrador = usuario.rol === 'administrador';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid #e2e8f0' }}>
        <Space>
          <Avatar icon={<Icon icon="mdi:account-outline" />} />
          <Text>{usuario.nombre} <Text type="secondary">({usuario.rol})</Text></Text>
        </Space>

        <Space>
          {vista === 'principal' ? (
            <>
              <Button
                type="text"
                icon={<Icon icon="mdi:history" />}
                onClick={() => setVista('historial')}
              >
                Historial
              </Button>
              {esAdministrador && (
                <Button
                  type="text"
                  icon={<Icon icon="mdi:email-edit-outline" />}
                  onClick={() => setVista('admin')}
                >
                  Administración de correos
                </Button>
              )}
            </>
          ) : (
            <Button
              type="text"
              icon={<Icon icon="mdi:arrow-left" />}
              onClick={() => setVista('principal')}
            >
              Volver
            </Button>
          )}
          <Button type="text" icon={<Icon icon="mdi:logout" />} onClick={cerrarSesion}>
            Cerrar sesión
          </Button>
        </Space>
      </Header>

      <Content>
        {vista === 'admin' ? (
          <PanelAdministracion />
        ) : vista === 'historial' ? (
          <PanelHistorial />
        ) : ejecucionActual ? (
          <PanelMonitoreo
            ejecucionId={ejecucionActual.id}
            mes={ejecucionActual.mes}
            anio={ejecucionActual.anio}
            onNuevaEjecucion={limpiarEjecucion}
            onEjecucionInvalida={limpiarEjecucion}
          />
        ) : (
          <PanelEjecucion onEjecucionIniciada={manejarEjecucionIniciada} />
        )}
      </Content>
    </Layout>
  );
}

export default App;