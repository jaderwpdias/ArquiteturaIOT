import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentData, setCurrentData] = useState({
    contador: 0,
    device_id: 'N/A',
    ultima_atualizacao: null
  });
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('🔌 Conectado ao servidor');
      setIsConnected(true);
      toast.success('Conectado ao servidor');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Desconectado do servidor');
      setIsConnected(false);
      toast.error('Desconectado do servidor');
    });

    newSocket.on('connected', (data) => {
      console.log('📡 Mensagem de conexão:', data);
    });

    newSocket.on('presence_update', (data) => {
      console.log('👥 Atualização de presença:', data);
      setCurrentData(prev => ({
        ...prev,
        contador: data.contador,
        device_id: data.device_id,
        ultima_atualizacao: data.timestamp
      }));
      
      setRecentActivity(prev => [
        {
          id: Date.now(),
          evento: data.evento,
          contador: data.contador,
          timestamp: data.timestamp,
          device_id: data.device_id
        },
        ...prev.slice(0, 19) // Manter apenas os últimos 20
      ]);
    });

    newSocket.on('status_update', (data) => {
      console.log('📊 Atualização de status:', data);
    });

    newSocket.on('new_alert', (data) => {
      console.log('🚨 Novo alerta:', data);
      setActiveAlerts(prev => [data, ...prev]);
      
      // Mostrar notificação
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">🚨</span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {data.titulo}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {data.descricao}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Fechar
            </button>
          </div>
        </div>
      ), {
        duration: 6000,
      });
    });

    newSocket.on('alert_resolved', (data) => {
      console.log('✅ Alerta resolvido:', data);
      setActiveAlerts(prev => 
        prev.filter(alert => alert.id !== data.alertId)
      );
      toast.success('Alerta resolvido');
    });

    newSocket.on('error', (data) => {
      console.error('❌ Erro do socket:', data);
      toast.error(`Erro: ${data.message}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const sendCommand = (deviceId, command, payload = {}) => {
    if (socket && isConnected) {
      socket.emit('send_command', { deviceId, command, payload });
    } else {
      toast.error('Não conectado ao servidor');
    }
  };

  const resolveAlert = (alertId) => {
    if (socket && isConnected) {
      socket.emit('resolve_alert', alertId);
    } else {
      toast.error('Não conectado ao servidor');
    }
  };

  const joinDevice = (deviceId) => {
    if (socket && isConnected) {
      socket.emit('join_device', deviceId);
    }
  };

  const leaveDevice = (deviceId) => {
    if (socket && isConnected) {
      socket.emit('leave_device', deviceId);
    }
  };

  const value = {
    socket,
    isConnected,
    currentData,
    activeAlerts,
    recentActivity,
    sendCommand,
    resolveAlert,
    joinDevice,
    leaveDevice
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
