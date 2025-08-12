import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCheck, FaTimes, FaEye, FaTrash } from 'react-icons/fa';
import moment from 'moment';
import 'moment/locale/pt-br';
import toast from 'react-hot-toast';

moment.locale('pt-br');

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchAlerts();
  }, [filter, selectedDevice, pagination.page]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        status: filter !== 'all' ? filter : undefined,
        device_id: selectedDevice !== 'all' ? selectedDevice : undefined
      };

      const response = await axios.get('/api/alerta', { params });
      setAlerts(response.data.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
      toast.error('Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await axios.patch(`/api/alerta/${alertId}/resolve`);
      toast.success('Alerta resolvido com sucesso');
      fetchAlerts();
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
      toast.error('Erro ao resolver alerta');
    }
  };

  const ignoreAlert = async (alertId) => {
    try {
      await axios.patch(`/api/alerta/${alertId}/ignore`);
      toast.success('Alerta ignorado');
      fetchAlerts();
    } catch (error) {
      console.error('Erro ao ignorar alerta:', error);
      toast.error('Erro ao ignorar alerta');
    }
  };

  const deleteAlert = async (alertId) => {
    if (window.confirm('Tem certeza que deseja excluir este alerta?')) {
      try {
        await axios.delete(`/api/alerta/${alertId}`);
        toast.success('Alerta excluído com sucesso');
        fetchAlerts();
      } catch (error) {
        console.error('Erro ao excluir alerta:', error);
        toast.error('Erro ao excluir alerta');
      }
    }
  };

  const getAlertIcon = (tipo) => {
    switch (tipo) {
      case 'OCUPACAO_MAXIMA':
        return '🚨';
      case 'SALA_OCIOSA':
        return '⏰';
      case 'PERMANENCIA_ANOMAL':
        return '⚠️';
      case 'PADRAO_HORARIO':
        return '📊';
      default:
        return '🔔';
    }
  };

  const getAlertColor = (tipo) => {
    switch (tipo) {
      case 'OCUPACAO_MAXIMA':
        return 'bg-red-50 border-red-200';
      case 'SALA_OCIOSA':
        return 'bg-yellow-50 border-yellow-200';
      case 'PERMANENCIA_ANOMAL':
        return 'bg-orange-50 border-orange-200';
      case 'PADRAO_HORARIO':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ATIVO':
        return 'bg-red-100 text-red-800';
      case 'RESOLVIDO':
        return 'bg-green-100 text-green-800';
      case 'IGNORADO':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alertas</h1>
          <p className="text-gray-600">Gerenciamento de alertas do sistema</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="ATIVO">Ativos</option>
              <option value="RESOLVIDO">Resolvidos</option>
              <option value="IGNORADO">Ignorados</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dispositivo
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="ESP32_Presenca_001">ESP32 Presença 001</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Alertas ({pagination.total})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div
                key={alert._id}
                className={`p-6 ${getAlertColor(alert.tipo)} border-l-4`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <span className="text-3xl">{getAlertIcon(alert.tipo)}</span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {alert.titulo}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{alert.descricao}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Contador: {alert.contador}</span>
                        <span>Dispositivo: {alert.device_id}</span>
                        <span>Criado: {moment(alert.timestamp).format('DD/MM/YYYY HH:mm:ss')}</span>
                        {alert.email_enviado && (
                          <span className="text-green-600">✓ Email enviado</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {alert.status === 'ATIVO' && (
                      <>
                        <button
                          onClick={() => resolveAlert(alert._id)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                          title="Resolver"
                        >
                          <FaCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => ignoreAlert(alert._id)}
                          className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-full transition-colors"
                          title="Ignorar"
                        >
                          <FaTimes className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteAlert(alert._id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                      title="Excluir"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              Nenhum alerta encontrado
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
              {pagination.total} alertas
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              <span className="px-3 py-2 text-sm font-medium text-gray-700">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
