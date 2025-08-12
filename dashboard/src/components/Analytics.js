import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedDevice, days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/dashboard/analytics?device_id=${selectedDevice}&days=${days}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Erro ao buscar análises:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Nenhum dado disponível para análise</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Análises</h1>
          <p className="text-gray-600">Análises avançadas e insights do sistema</p>
        </div>
        
        <div className="flex space-x-4">
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Dispositivos</option>
            <option value="ESP32_Presenca_001">ESP32 Presença 001</option>
          </select>
          
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Padrões por Dia da Semana */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Padrões de Uso por Dia da Semana</h3>
        {analytics.weekdayPatterns && (
          <Bar
            data={{
              labels: analytics.weekdayPatterns.map(w => w.dayName),
              datasets: [
                {
                  label: 'Ocupação Média',
                  data: analytics.weekdayPatterns.map(w => Math.round(w.avgOccupancy * 10) / 10),
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                },
                {
                  label: 'Ocupação Máxima',
                  data: analytics.weekdayPatterns.map(w => w.maxOccupancy),
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

      {/* Horários de Pico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Horários de Pico</h3>
          {analytics.peakHours && (
            <Bar
              data={{
                labels: analytics.peakHours.map(h => `${h._id}h`),
                datasets: [
                  {
                    label: 'Ocupação Média',
                    data: analytics.peakHours.map(h => Math.round(h.avgOccupancy * 10) / 10),
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
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
                  },
                },
              }}
            />
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Duração de Permanência</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <span className="font-medium">Duração Média:</span>
              <span className="text-2xl font-bold text-blue-600">
                {Math.round(analytics.stayDuration.avgDuration || 0)} min
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <span className="font-medium">Duração Máxima:</span>
              <span className="text-2xl font-bold text-green-600">
                {Math.round(analytics.stayDuration.maxDuration || 0)} min
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
              <span className="font-medium">Duração Mínima:</span>
              <span className="text-2xl font-bold text-yellow-600">
                {Math.round(analytics.stayDuration.minDuration || 0)} min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Eficiência de Uso da Sala */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Eficiência de Uso da Sala</h3>
        {analytics.roomEfficiency && (
          <Line
            data={{
              labels: analytics.roomEfficiency.map(r => moment(r.date).format('DD/MM')),
              datasets: [
                {
                  label: 'Eficiência (%)',
                  data: analytics.roomEfficiency.map(r => Math.round(r.efficiency)),
                  borderColor: 'rgb(168, 85, 247)',
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
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
                  max: 100,
                  ticks: {
                    callback: function(value) {
                      return value + '%';
                    }
                  },
                },
              },
            }}
          />
        )}
      </div>

      {/* Resumo Estatístico */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Período Analisado</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.period}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Dias com Dados</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.roomEfficiency?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <span className="text-2xl">⏰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Horário Mais Ativo</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.peakHours?.[0]?._id || 'N/A'}h
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <span className="text-2xl">📅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Dia Mais Movimentado</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.weekdayPatterns?.[0]?.dayName || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
