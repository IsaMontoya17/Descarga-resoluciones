import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Select, Space, Tag, Drawer, Typography, Row, Col, Statistic, Empty } from 'antd';
import { Icon } from '@iconify/react';
import { listarHistorialEjecuciones, obtenerDetalleHistorialEjecucion } from '../api/client';
import TablaEstadoMunicipios from '../components/TablaEstadoMunicipios';

const { Title } = Typography;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ESTADO_TAG = {
  completado: { color: 'success', texto: 'Completado' },
  con_revision_pendiente: { color: 'warning', texto: 'Con revisiones pendientes' },
  error: { color: 'error', texto: 'Error' },
  en_progreso: { color: 'processing', texto: 'En progreso' },
};

function PanelHistorial() {
  const [filtros, setFiltros] = useState({ mes: undefined, anio: undefined, estatus: undefined });
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(10);
  const [datos, setDatos] = useState({ ejecuciones: [], total: 0 });
  const [cargando, setCargando] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    listarHistorialEjecuciones({ ...filtros, pagina, porPagina })
      .then(setDatos)
      .catch(() => setDatos({ ejecuciones: [], total: 0 }))
      .finally(() => setCargando(false));
  }, [filtros, pagina, porPagina]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirDetalle(id) {
    setCargandoDetalle(true);
    setDetalle({ id });
    obtenerDetalleHistorialEjecucion(id)
      .then(setDetalle)
      .catch(() => setDetalle(null))
      .finally(() => setCargandoDetalle(false));
  }

  const columnas = [
    { title: 'Periodo', key: 'periodo', render: (_, e) => `${MESES[e.mes - 1]} ${e.anio}` },
    {
      title: 'Fecha de ejecución',
      dataIndex: 'fechaInicio',
      key: 'fechaInicio',
      render: (v) => new Date(v).toLocaleString('es-CO'),
    },
    {
      title: 'Usuario',
      key: 'usuario',
      render: (_, e) => e.usuario?.nombre || e.usuario?.usuario || '—',
    },
    {
      title: 'Estado',
      key: 'estado',
      render: (_, e) => {
        const info = ESTADO_TAG[e.estadoResumen] || ESTADO_TAG.en_progreso;
        return <Tag color={info.color}>{info.texto}</Tag>;
      },
    },
    {
      title: 'Descargas',
      key: 'descargas',
      render: (_, e) => (
        <Space size={4}>
          <Tag color="success">{e.resumen.descarga.exitoso ?? 0}</Tag>
          <Tag color="default">{e.resumen.descarga.sin_resoluciones ?? 0}</Tag>
          <Tag color="error">{e.resumen.descarga.fallido ?? 0}</Tag>
        </Space>
      ),
    },
    {
      title: 'Correos',
      key: 'correos',
      render: (_, e) => (
        <Space size={4}>
          <Tag color="success">{e.resumen.envio.exitoso ?? 0}</Tag>
          <Tag color="warning">{e.resumen.envio.requiere_revision_manual ?? 0}</Tag>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: '#f1f5f9', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Title level={4} style={{ marginBottom: 16 }}>Historial de ejecuciones</Title>

        <Card style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="Mes"
              allowClear
              style={{ width: 140 }}
              value={filtros.mes}
              onChange={(v) => { setPagina(1); setFiltros((f) => ({ ...f, mes: v })); }}
              options={MESES.map((m, i) => ({ label: m, value: i + 1 }))}
            />
            <Select
              placeholder="Año"
              allowClear
              style={{ width: 120 }}
              value={filtros.anio}
              onChange={(v) => { setPagina(1); setFiltros((f) => ({ ...f, anio: v })); }}
              options={[2025, 2026, 2027].map((a) => ({ label: a, value: a }))}
            />
            <Select
              placeholder="Estado"
              allowClear
              style={{ width: 180 }}
              value={filtros.estatus}
              onChange={(v) => { setPagina(1); setFiltros((f) => ({ ...f, estatus: v })); }}
              options={[
                { label: 'Completado', value: 'completado' },
                { label: 'Error', value: 'error' },
                { label: 'En progreso', value: 'en_progreso' },
              ]}
            />
          </Space>
        </Card>

        <Card>
          <Table
            rowKey="id"
            loading={cargando}
            dataSource={datos.ejecuciones}
            columns={columnas}
            locale={{ emptyText: <Empty description="Sin ejecuciones registradas" /> }}
            onRow={(e) => ({ onClick: () => abrirDetalle(e.id), style: { cursor: 'pointer' } })}
            pagination={{
              current: pagina,
              pageSize: porPagina,
              total: datos.total,
              onChange: setPagina,
              showSizeChanger: false,
            }}
          />
        </Card>
      </div>

      <Drawer
        title={detalle?.mes ? `Ejecución de ${MESES[detalle.mes - 1]} ${detalle.anio}` : 'Detalle de ejecución'}
        width={780}
        open={!!detalle}
        onClose={() => setDetalle(null)}
        loading={cargandoDetalle}
      >
        {detalle?.municipios && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic
                  title="Correos enviados"
                  value={detalle.resumen.envio.exitoso ?? 0}
                  prefix={<Icon icon="ooui:success" style={{ color: '#22c55e' }} />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Revisión manual"
                  value={detalle.resumen.envio.requiere_revision_manual ?? 0}
                  prefix={<Icon icon="fluent:document-search-16-filled" style={{ color: '#f59e0b' }} />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Sin movimiento"
                  value={detalle.resumen.descarga.sin_resoluciones ?? 0}
                  prefix={<Icon icon="fa-solid:empty-set" style={{ color: '#94a3b8' }} />}
                />
              </Col>
            </Row>
            <TablaEstadoMunicipios municipios={detalle.municipios} readOnly />
          </>
        )}
      </Drawer>
    </div>
  );
}

export default PanelHistorial;