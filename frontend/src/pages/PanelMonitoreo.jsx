import { useEffect, useState, useRef, useMemo } from 'react';
import { Card, Progress, Tag, Typography, Statistic, Row, Col, Timeline, Space } from 'antd';
import { Icon } from '@iconify/react';
import socket from '../api/socket';
import { consultarEjecucion } from '../api/client';

const { Title, Text } = Typography;

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ESTATUS_TAG = {
    completado: { color: 'success', texto: 'Completado' },
    error: { color: 'error', texto: 'Error' },
    en_progreso: { color: 'processing', texto: 'En progreso' },
    pendiente: { color: 'default', texto: 'Pendiente' },
};

function PanelMonitoreo({ ejecucionId, mes, anio }) {
    const [eventos, setEventos] = useState([]);
    const [estatus, setEstatus] = useState('en_progreso');
    const [reporte, setReporte] = useState(null);
    const finRef = useRef(null);

    useEffect(() => {
        consultarEjecucion(ejecucionId)
            .then((estado) => {
                setEventos(estado.eventos || []);
                setEstatus(estado.estatus);
                setReporte(estado.reporte);
            })
            .catch(() => { });

        socket.connect();
        socket.emit('unirse_ejecucion', ejecucionId);

        function manejarProgreso(evento) {
            setEventos((prev) => [...prev, evento]);
        }

        function manejarEstadoFinal({ estatus, reporte, error }) {
            setEstatus(estatus);
            if (reporte) setReporte(reporte);
            if (error) setEventos((prev) => [...prev, { tipo: 'error_general', error }]);
        }

        socket.on('progreso', manejarProgreso);
        socket.on('estado_final', manejarEstadoFinal);

        return () => {
            socket.off('progreso', manejarProgreso);
            socket.off('estado_final', manejarEstadoFinal);
            socket.disconnect();
        };
    }, [ejecucionId]);

    useEffect(() => {
        finRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [eventos]);

    const { eventosDescarga, eventosEnvio, envioIniciado } = useMemo(() => {
        const indiceCorte = eventos.findIndex((e) => e.tipo === 'iniciando_envio_correos');
        if (indiceCorte === -1) {
            return { eventosDescarga: eventos, eventosEnvio: [], envioIniciado: false };
        }
        return {
            eventosDescarga: eventos.slice(0, indiceCorte),
            eventosEnvio: eventos.slice(indiceCorte + 1),
            envioIniciado: true,
        };
    }, [eventos]);

    // --- Estadísticas de descarga ---
    const totalMunicipios = eventosDescarga.find((e) => e.tipo === 'municipios_encontrados')?.total;
    const descargaExitosos = eventosDescarga.filter((e) => e.tipo === 'descarga_ok').length;
    const descargaSinMovimiento = eventosDescarga.filter((e) => e.tipo === 'descarga_sin_datos').length;
    const descargaFallos = eventosDescarga.filter((e) => e.tipo === 'descarga_error').length;
    const descargaProcesados = descargaExitosos + descargaSinMovimiento + descargaFallos;
    const descargaPorcentaje = totalMunicipios ? Math.round((descargaProcesados / totalMunicipios) * 100) : 0;
    const descargaCompleta = totalMunicipios && descargaProcesados >= totalMunicipios;

    // --- Estadísticas de envío ---
    const totalAEnviar = eventosEnvio.find((e) => e.tipo === 'inicio_envio')?.total;
    const envioExitosos = eventosEnvio.filter((e) => e.tipo === 'envio_ok').length;
    const envioRevisionManual = eventosEnvio.filter((e) => e.tipo === 'envio_revision_manual').length;
    const envioProcesados = envioExitosos + envioRevisionManual;
    const envioPorcentaje = totalAEnviar ? Math.round((envioProcesados / totalAEnviar) * 100) : 0;

    const estatusDescarga = descargaCompleta ? 'completado' : 'en_progreso';
    const estatusEnvio = !envioIniciado
        ? 'pendiente'
        : reporte?.envio
            ? 'completado'
            : 'en_progreso';

    const tagGeneral = ESTATUS_TAG[estatus] || ESTATUS_TAG.en_progreso;

    const municipiosSinMovimiento = reporte?.descarga?.sin_resoluciones ?? [];

    return (
        <div style={{ minHeight: 'calc(100vh - 64px)', background: '#f1f5f9', padding: '32px 16px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ marginBottom: 16 }}>
                    <Title level={4} style={{ marginBottom: 4 }}>
                        Ejecución de {MESES[mes - 1]} {anio}
                    </Title>
                    <Tag color={tagGeneral.color}>{tagGeneral.texto}</Tag>
                </div>

                <Row gutter={16}>
                    {/* --- FASE 1: DESCARGA --- */}
                    <Col xs={24} lg={12} style={{ marginBottom: 16 }}>
                        <Card style={{ height: '100%' }}>
                            <Title level={5} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Icon icon="material-symbols:download-for-offline" />
                                1. Descarga de resoluciones (BCGS)
                                <Tag color={ESTATUS_TAG[estatusDescarga].color} style={{ marginLeft: 'auto' }}>
                                    {ESTATUS_TAG[estatusDescarga].texto}
                                </Tag>
                            </Title>

                            {totalMunicipios ? (
                                <>
                                    <Progress percent={descargaPorcentaje} status={estatus === 'error' && !descargaCompleta ? 'exception' : 'active'} />
                                    <Row gutter={16} style={{ marginTop: 12 }}>
                                        <Col span={8}>
                                            <Statistic
                                                title="Éxitos"
                                                value={descargaExitosos}
                                                prefix={<Icon icon="ooui:success" style={{ color: '#22c55e' }} />}
                                            />
                                        </Col>
                                        <Col span={8}>
                                            <Statistic
                                                title="Sin movimiento"
                                                value={descargaSinMovimiento}
                                                prefix={<Icon icon="fa-solid:empty-set" style={{ color: '#94a3b8', fontSize: 20 }} />}
                                            />
                                        </Col>
                                        <Col span={8}>
                                            <Statistic
                                                title="Fallos"
                                                value={descargaFallos}
                                                prefix={<Icon icon="material-symbols:chat-error" style={{ color: '#ef4444' }} />}
                                            />
                                        </Col>
                                    </Row>
                                </>
                            ) : (
                                <Text type="secondary">Iniciando sesión en BCGS...</Text>
                            )}

                            {municipiosSinMovimiento.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <Text strong style={{ fontSize: 13 }}>Municipios sin movimiento:</Text>
                                    <div style={{ marginTop: 8, maxHeight: 100, overflowY: 'auto' }}>
                                        <Space size={[4, 4]} wrap>
                                            {municipiosSinMovimiento.map((m) => (
                                                <Tag key={m.codigo} color="default">{m.municipio}</Tag>
                                            ))}
                                        </Space>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: 16, maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                                <Timeline
                                    items={eventosDescarga
                                        .filter((e) => e.municipio || e.error)
                                        .map((e) => ({
                                            children: (
                                                <Text style={{ fontSize: 12 }}>
                                                    <Text code>{e.tipo}</Text> {e.municipio || ''} {e.error ? `— ${e.error}` : ''}
                                                </Text>
                                            ),
                                        }))}
                                />
                            </div>
                        </Card>
                    </Col>

                    {/* --- FASE 2: ENVÍO --- */}
                    <Col xs={24} lg={12} style={{ marginBottom: 16 }}>
                        <Card style={{ height: '100%', opacity: envioIniciado ? 1 : 0.5 }}>
                            <Title level={5} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Icon icon="ic:round-email" />
                                2. Envío de correos
                                <Tag color={ESTATUS_TAG[estatusEnvio].color} style={{ marginLeft: 'auto' }}>
                                    {ESTATUS_TAG[estatusEnvio].texto}
                                </Tag>
                            </Title>

                            {!envioIniciado ? (
                                <Text type="secondary">Se activará cuando finalice la descarga.</Text>
                            ) : totalAEnviar ? (
                                <>
                                    <Progress percent={envioPorcentaje} status={estatus === 'error' ? 'exception' : 'active'} />
                                    <Row gutter={16} style={{ marginTop: 12 }}>
                                        <Col span={12}>
                                            <Statistic
                                                title="Enviados"
                                                value={envioExitosos}
                                                prefix={<Icon icon="ooui:success" style={{ color: '#22c55e' }} />}
                                            />
                                        </Col>
                                        <Col span={12}>
                                            <Statistic
                                                title="Requieren revisión"
                                                value={envioRevisionManual}
                                                prefix={<Icon icon="fluent:document-search-16-filled" style={{ color: '#f59e0b' }} />}
                                            />
                                        </Col>
                                    </Row>
                                </>
                            ) : (
                                <Text type="secondary">Preparando el envío de correos...</Text>
                            )}

                            {envioIniciado && (
                                <div style={{ marginTop: 16, maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                                    <Timeline
                                        items={eventosEnvio
                                            .filter((e) => e.municipio || e.error)
                                            .map((e) => ({
                                                children: (
                                                    <Text style={{ fontSize: 12 }}>
                                                        <Text code>{e.tipo}</Text> {e.municipio || ''} {e.error ? `— ${e.error}` : ''}
                                                    </Text>
                                                ),
                                            }))}
                                    />
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>

                <div ref={finRef} />

                {reporte && (
                    <Card style={{ marginTop: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <Icon
                                icon="ooui:success"
                                style={{ fontSize: 28, color: '#22c55e' }}
                            />
                            <div>
                                <Title level={5} style={{ margin: 0 }}>Ejecución finalizada</Title>
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    {MESES[mes - 1]} {anio} — proceso completo de descarga y envío
                                </Text>
                            </div>
                        </div>

                        <Row gutter={[16, 16]}>
                            <Col xs={12} sm={6}>
                                <Card size="small" style={{ textAlign: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                    <Icon icon="ooui:success" style={{ fontSize: 22, color: '#22c55e' }} />
                                    <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
                                        {reporte.descarga?.exitosos?.length ?? 0}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Resoluciones descargadas</Text>
                                </Card>
                            </Col>

                            <Col xs={12} sm={6}>
                                <Card size="small" style={{ textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <Icon icon="fa-solid:empty-set" style={{ fontSize: 20, color: '#94a3b8' }} />
                                    <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
                                        {reporte.descarga?.sin_resoluciones?.length ?? 0}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Sin movimiento</Text>
                                </Card>
                            </Col>

                            <Col xs={12} sm={6}>
                                <Card size="small" style={{ textAlign: 'center', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                    <Icon icon="ic:round-email" style={{ fontSize: 22, color: '#3b82f6' }} />
                                    <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
                                        {reporte.envio?.exitosos?.length ?? 0}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Correos enviados</Text>
                                </Card>
                            </Col>

                            <Col xs={12} sm={6}>
                                <Card size="small" style={{ textAlign: 'center', background: '#fffbeb', border: '1px solid #fde68a' }}>
                                    <Icon icon="fluent:document-search-16-filled" style={{ fontSize: 20, color: '#f59e0b' }} />
                                    <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
                                        {reporte.envio?.requieren_revision_manual?.length ?? 0}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Requieren revisión</Text>
                                </Card>
                            </Col>
                        </Row>

                        {reporte.envio?.requieren_revision_manual?.length > 0 && (
                            <div style={{ marginTop: 16, padding: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                                <Text strong style={{ fontSize: 13, color: '#92400e' }}>
                                    <Icon icon="fluent:document-search-16-filled" style={{ marginRight: 6 }} />
                                    Municipios que requieren revisión manual:
                                </Text>
                                <div style={{ marginTop: 8 }}>
                                    <Space size={[4, 4]} wrap>
                                        {reporte.envio.requieren_revision_manual.map((m) => (
                                            <Tag key={m.codigo} color="warning">{m.municipio}</Tag>
                                        ))}
                                    </Space>
                                </div>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
}

export default PanelMonitoreo;