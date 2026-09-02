import { useEffect, useState, useMemo } from 'react';
import { Table, Input, Button, Modal, Form, Select, Tag, Typography, Space, message, Tooltip } from 'antd';
import { Icon } from '@iconify/react';
import { listarMunicipiosAdmin, actualizarCorreosMunicipio } from '../api/client';

const { Title, Text } = Typography;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarListaCorreos(_, lista) {
    if (!Array.isArray(lista) || lista.length === 0) return Promise.resolve();
    const invalido = lista.find((email) => !REGEX_EMAIL.test(String(email).trim()));
    if (invalido) {
        return Promise.reject(new Error(`"${invalido}" no es un correo válido.`));
    }
    return Promise.resolve();
}

function CeldaCorreos({ lista, color }) {
    if (!lista || lista.length === 0) {
        return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
    }
    return (
        <Space size={[4, 4]} wrap>
            {lista.map((email) => (
                <Tag key={email} color={color} style={{ fontSize: 11 }}>{email}</Tag>
            ))}
        </Space>
    );
}

function PanelAdministracion() {
    const [municipios, setMunicipios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [municipioEditando, setMunicipioEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [form] = Form.useForm();

    function cargarMunicipios() {
        setCargando(true);
        listarMunicipiosAdmin()
            .then(setMunicipios)
            .catch((err) => message.error(err.message))
            .finally(() => setCargando(false));
    }

    useEffect(() => {
        cargarMunicipios();
    }, []);

    const municipiosFiltrados = useMemo(() => {
        const termino = busqueda.trim().toLowerCase();
        if (!termino) return municipios;
        return municipios.filter(
            (m) => m.nombre.toLowerCase().includes(termino) || m.codigoBcgs.includes(termino)
        );
    }, [municipios, busqueda]);

    function abrirEdicion(municipio) {
        setMunicipioEditando(municipio);
        form.setFieldsValue({
            para: municipio.correos.para,
            cc: municipio.correos.cc,
            cco: municipio.correos.cco,
        });
    }

    function cerrarEdicion() {
        setMunicipioEditando(null);
        form.resetFields();
    }

    async function guardarCorreos() {
        try {
            const valores = await form.validateFields();
            setGuardando(true);

            const limpiar = (lista) => (lista || []).map((e) => String(e).trim()).filter(Boolean);
            const correos = {
                para: limpiar(valores.para),
                cc: limpiar(valores.cc),
                cco: limpiar(valores.cco),
            };

            await actualizarCorreosMunicipio(municipioEditando.id, correos);

            setMunicipios((prev) =>
                prev.map((m) => (m.id === municipioEditando.id ? { ...m, correos } : m))
            );

            message.success(`Correos de ${municipioEditando.nombre} actualizados.`);
            cerrarEdicion();
        } catch (err) {
            if (err?.errorFields) return; // error de validación del form, ya se muestra inline
            message.error(err.message || 'No se pudo guardar los cambios.');
        } finally {
            setGuardando(false);
        }
    }

    const columnas = [
        {
            title: 'Código',
            dataIndex: 'codigoBcgs',
            key: 'codigoBcgs',
            width: 90,
            sorter: (a, b) => a.codigoBcgs.localeCompare(b.codigoBcgs),
        },
        {
            title: 'Municipio',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 160,
            sorter: (a, b) => a.nombre.localeCompare(b.nombre),
        },
        {
            title: 'Para',
            key: 'para',
            render: (_, m) => <CeldaCorreos lista={m.correos.para} color="blue" />,
        },
        {
            title: 'CC',
            key: 'cc',
            render: (_, m) => <CeldaCorreos lista={m.correos.cc} color="default" />,
        },
        {
            title: 'CCO',
            key: 'cco',
            render: (_, m) => <CeldaCorreos lista={m.correos.cco} color="default" />,
        },
        {
            title: '',
            key: 'acciones',
            width: 60,
            render: (_, m) => (
                <Tooltip title="Editar correos">
                    <Button
                        type="text"
                        icon={<Icon icon="mdi:pencil-outline" />}
                        onClick={() => abrirEdicion(m)}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div style={{ minHeight: 'calc(100vh - 64px)', background: '#f1f5f9', padding: '32px 16px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <Title level={4} style={{ marginBottom: 4 }}>
                            <Icon icon="mdi:email-edit-outline" style={{ marginRight: 8 }} />
                            Administración de correos por municipio
                        </Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {municipios.length} municipios registrados
                        </Text>
                    </div>
                    <Input.Search
                        placeholder="Buscar por nombre o código..."
                        allowClear
                        style={{ width: 280 }}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                <Table
                    rowKey="id"
                    columns={columnas}
                    dataSource={municipiosFiltrados}
                    loading={cargando}
                    pagination={{ pageSize: 15, showSizeChanger: false }}
                    style={{ background: '#fff', borderRadius: 8 }}
                />
            </div>

            <Modal
                title={municipioEditando ? `Correos de ${municipioEditando.nombre}` : ''}
                open={!!municipioEditando}
                onCancel={cerrarEdicion}
                onOk={guardarCorreos}
                confirmLoading={guardando}
                okText="Guardar"
                cancelText="Cancelar"
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                        name="para"
                        label="Para (destinatario principal)"
                        rules={[
                            { validator: validarListaCorreos },
                            {
                                validator: (_, v) =>
                                    v && v.length > 0
                                        ? Promise.resolve()
                                        : Promise.reject(new Error('Debes agregar al menos un correo destinatario.')),
                            },
                        ]}
                    >
                        <Select mode="tags" open={false} tokenSeparators={[',', ' ']} placeholder="correo@ejemplo.com" />
                    </Form.Item>

                    <Form.Item name="cc" label="CC" rules={[{ validator: validarListaCorreos }]}>
                        <Select mode="tags" open={false} tokenSeparators={[',', ' ']} placeholder="correo@ejemplo.com" />
                    </Form.Item>

                    <Form.Item name="cco" label="CCO" rules={[{ validator: validarListaCorreos }]}>
                        <Select mode="tags" open={false} tokenSeparators={[',', ' ']} placeholder="correo@ejemplo.com" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default PanelAdministracion;