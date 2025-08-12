import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import { 
  FaUsers, 
  FaExclamationTriangle, 
  FaChartLine, 
  FaClock,
  FaWifi,
  FaWifiSlash
} from 'react-icons/fa';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import moment from 'moment';
import 'moment/locale/pt-br';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

moment.locale('pt-br');

const Dashboard = () => {
  const { isConnected, currentData, activeAlerts, recentActivity } = useSocket();
  const [overview, setOverview] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState('all');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, [selectedDevice]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [overviewRes, chartsRes] = await Promise.all([
        axios.get(`/api/dashboard/overview?device_id=${selectedDevice}`),
        axios.get(`/api/dashboard/charts?device_id=${selectedDevice}&days=7`)
      ]);

      setOverview(overviewRes.data);
      setChartData(chartsRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    return status ? 'text-green-500' : 'text-red-500';
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
        return 'bg-red-100 border-red-300 text-red-800';
      case 'SALA_OCIOSA':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'PERMANENCIA_ANOMAL':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'PADRAO_HORARIO':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Sistema de Contador de Presença</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 ${getStatusColor(isConnected)}`}>
            {isConnected ? <FaWifi /> : <FaWifiSlash />}
            <span className="text-sm font-medium">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Contador Atual */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <FaUsers className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pessoas na Sala</p>
              <p className="text-2xl font-bold text-gray-900">{currentData.contador}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              Dispositivo: {currentData.device_id}
            </p>
            {currentData.ultima_atualizacao && (
              <p className="text-xs text-gray-500">
                Última atualização: {moment(currentData.ultima_atualizacao).format('HH:mm:ss')}
              </p>
            )}
          </div>
        </div>

        {/* Alertas Ativos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <FaExclamationTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Alertas Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{activeAlerts.length}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              {activeAlerts.length > 0 ? 'Requer atenção' : 'Tudo normal'}
            </p>
          </div>
        </div>

        {/* Estatísticas de Hoje */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <FaChartLine className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Entradas Hoje</p>
              <p className="text-2xl font-bold text-gray-900">
                {overview?.today?.totalEntries || 0}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              Saídas: {overview?.today?.totalExits || 0}
            </p>
          </div>
        </div>

        {/* Ocupação Máxima */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <FaClock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ocupação Máx.</p>
              <p className="text-2xl font-bold text-gray-900">
                {overview?.today?.maxOccupancy || 0}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              Média: {Math.round(overview?.today?.avgOccupancy || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Ocupação */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ocupação nas Últimas 24h</h3>
          {chartData?.hourly && (
            <Line
              data={{
                labels: chartData.hourly.map(item => moment(item._id).format('HH:mm')),
                datasets: [
                  {
                    label: 'Pessoas na Sala',
                    data: chartData.hourly.map(item => item.contador),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              }}
            />
          )}
        </div>

        {/* Gráfico de Movimento */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Movimento por Hora</h3>
          {chartData?.movementByHour && (
            <Bar
              data={{
                labels: chartData.movementByHour.map(item => `${item._id}h`),
                datasets: [
                  {
                    label: 'Entradas',
                    data: chartData.movementByHour.map(item => item.entries),
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                  },
                  {
                    label: 'Saídas',
                    data: chartData.movementByHour.map(item => item.exits),
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              }}
            />
          )}
        </div>
      </div>

      {/* Alertas Ativos */}
      {activeAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Alertas Ativos</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {activeAlerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getAlertColor(alert.tipo)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{getAlertIcon(alert.tipo)}</span>
                      <div>
                        <h4 className="font-medium">{alert.titulo}</h4>
                        <p className="text-sm mt-1">{alert.descricao}</p>
                        <p className="text-xs mt-2">
                          {moment(alert.timestamp).format('DD/MM/YYYY HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Contador: {alert.contador}</p>
                      <p className="text-xs">Dispositivo: {alert.device_id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Atividade Recente */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Atividade Recente</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      activity.evento === 'ENTRADA' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium">
                        {activity.evento === 'ENTRADA' ? 'Pessoa entrou' : 'Pessoa saiu'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {moment(activity.timestamp).format('HH:mm:ss')} - 
                        Contador: {activity.contador}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{activity.device_id}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhuma atividade recente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
