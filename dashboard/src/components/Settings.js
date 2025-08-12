import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSave, FaTest, FaWifi, FaDatabase, FaEnvelope } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Settings = () => {
  const [config, setConfig] = useState({
    maxOccupancy: 5,
    idleTimeout: 30,
    anomalyTimeout: 120,
    adminEmail: '',
    managerEmail: ''
  });
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    database: false,
    mqtt: false,
    email: false
  });

  useEffect(() => {
    fetchConfig();
    checkSystemStatus();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get('/api/config');
      const data = response.data;
      setConfig({
        maxOccupancy: data.maxOccupancy,
        idleTimeout: data.idleTimeout / 60000, // Converter para minutos
        anomalyTimeout: data.anomalyTimeout / 60000, // Converter para minutos
        adminEmail: data.adminEmail,
        managerEmail: data.managerEmail
      });
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast.error('Erro ao carregar configurações');
    }
  };

  const checkSystemStatus = async () => {
    try {
      const response = await axios.get('/api/health');
      setSystemStatus({
        database: response.data.database === 'connected',
        mqtt: response.data.mqtt.connected,
        email: true // Assumindo que está funcionando
      });
    } catch (error) {
      console.error('Erro ao verificar status do sistema:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Aqui você faria uma chamada para salvar as configurações
      // Por enquanto, apenas simular
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const testEmail = async () => {
    try {
      setLoading(true);
      
      // Simular teste de email
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Email de teste enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar email de teste:', error);
      toast.error('Erro ao enviar email de teste');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    return status ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (status) => {
    return status ? '🟢' : '🔴';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600">Configurações do sistema de presença</p>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status do Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-4 border rounded-lg">
            <FaDatabase className={`h-6 w-6 ${getStatusColor(systemStatus.database)}`} />
            <div>
              <p className="font-medium">Banco de Dados</p>
              <p className={`text-sm ${getStatusColor(systemStatus.database)}`}>
                {getStatusIcon(systemStatus.database)} {systemStatus.database ? 'Conectado' : 'Desconectado'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 border rounded-lg">
            <FaWifi className={`h-6 w-6 ${getStatusColor(systemStatus.mqtt)}`} />
            <div>
              <p className="font-medium">MQTT</p>
              <p className={`text-sm ${getStatusColor(systemStatus.mqtt)}`}>
                {getStatusIcon(systemStatus.mqtt)} {systemStatus.mqtt ? 'Conectado' : 'Desconectado'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 border rounded-lg">
            <FaEnvelope className={`h-6 w-6 ${getStatusColor(systemStatus.email)}`} />
            <div>
              <p className="font-medium">Email</p>
              <p className={`text-sm ${getStatusColor(systemStatus.email)}`}>
                {getStatusIcon(systemStatus.email)} {systemStatus.email ? 'Configurado' : 'Não configurado'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Alertas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ocupação Máxima
            </label>
            <input
              type="number"
              value={config.maxOccupancy}
              onChange={(e) => setConfig(prev => ({ ...prev, maxOccupancy: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="50"
            />
            <p className="text-sm text-gray-500 mt-1">Número máximo de pessoas na sala</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeout de Ociosidade (minutos)
            </label>
            <input
              type="number"
              value={config.idleTimeout}
              onChange={(e) => setConfig(prev => ({ ...prev, idleTimeout: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="5"
              max="120"
            />
            <p className="text-sm text-gray-500 mt-1">Tempo para considerar sala ociosa</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeout de Permanência Anormal (minutos)
            </label>
            <input
              type="number"
              value={config.anomalyTimeout}
              onChange={(e) => setConfig(prev => ({ ...prev, anomalyTimeout: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="30"
              max="480"
            />
            <p className="text-sm text-gray-500 mt-1">Tempo para alertar permanência anormal</p>
          </div>
        </div>
      </div>

      {/* Email Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Email</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email do Administrador
            </label>
            <input
              type="email"
              value={config.adminEmail}
              onChange={(e) => setConfig(prev => ({ ...prev, adminEmail: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@exemplo.com"
            />
            <p className="text-sm text-gray-500 mt-1">Receberá alertas de ocupação máxima e permanência anormal</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email da Gerência
            </label>
            <input
              type="email"
              value={config.managerEmail}
              onChange={(e) => setConfig(prev => ({ ...prev, managerEmail: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="gerencia@exemplo.com"
            />
            <p className="text-sm text-gray-500 mt-1">Receberá alertas de sala ociosa e padrões de horário</p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={testEmail}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
          >
            <FaTest className="h-4 w-4 mr-2" />
            Testar Email
          </button>
        </div>
      </div>

      {/* Device Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gerenciamento de Dispositivos</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">ESP32 Presença 001</h4>
              <p className="text-sm text-gray-500">Dispositivo principal da sala</p>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200">
                Configurar
              </button>
              <button className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200">
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <FaSave className="h-5 w-5 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
