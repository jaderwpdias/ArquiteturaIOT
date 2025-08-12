const mqtt = require('mqtt');
const PatternRecognition = require('./PatternRecognition');
const Presenca = require('../models/Presenca');

class MQTTService {
  constructor() {
    this.client = null;
    this.patternRecognition = new PatternRecognition();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Inicializa a conexão MQTT
   */
  async connect() {
    try {
      const options = {
        host: process.env.MQTT_BROKER.replace('mqtt://', ''),
        port: 1883,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        clientId: `backend_${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        rejectUnauthorized: false
      };

      this.client = mqtt.connect(options);

      this.client.on('connect', () => {
        console.log('✅ Conectado ao broker MQTT');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToTopics();
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.client.on('error', (error) => {
        console.error('❌ Erro MQTT:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('🔌 Conexão MQTT fechada');
        this.isConnected = false;
        this.handleReconnect();
      });

      this.client.on('reconnect', () => {
        console.log('🔄 Reconectando ao MQTT...');
        this.reconnectAttempts++;
      });

    } catch (error) {
      console.error('❌ Erro ao conectar MQTT:', error);
      this.handleReconnect();
    }
  }

  /**
   * Subscreve aos tópicos MQTT
   */
  subscribeToTopics() {
    const topics = [
      'sala/presenca',
      'sala/status',
      'sala/+/presenca',  // Wildcard para múltiplos dispositivos
      'sala/+/status'
    ];

    topics.forEach(topic => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`❌ Erro ao subscrever ${topic}:`, err);
        } else {
          console.log(`📡 Subscrevido ao tópico: ${topic}`);
        }
      });
    });
  }

  /**
   * Processa mensagens recebidas
   */
  async handleMessage(topic, message) {
    try {
      console.log(`📨 Mensagem recebida [${topic}]:`, message.toString());

      const data = JSON.parse(message.toString());

      switch (topic) {
        case 'sala/presenca':
        case 'sala/+/presenca':
          await this.handlePresenceData(data);
          break;
        
        case 'sala/status':
        case 'sala/+/status':
          await this.handleStatusData(data);
          break;
        
        default:
          console.log(`📝 Tópico não processado: ${topic}`);
      }

    } catch (error) {
      console.error('❌ Erro ao processar mensagem MQTT:', error);
    }
  }

  /**
   * Processa dados de presença
   */
  async handlePresenceData(data) {
    try {
      // Validar dados
      if (!data.contador || !data.evento || !data.device_id) {
        console.warn('⚠️ Dados de presença inválidos:', data);
        return;
      }

      // Salvar no banco de dados
      const presenca = new Presenca({
        contador: data.contador,
        timestamp: new Date(data.timestamp || Date.now()),
        evento: data.evento,
        sensor: data.sensor || 1,
        device_id: data.device_id,
        wifi_rssi: data.wifi_rssi,
        uptime: data.uptime
      });

      await presenca.save();
      console.log(`💾 Dados de presença salvos: ${data.evento} - ${data.contador} pessoas`);

      // Analisar padrões e gerar alertas
      await this.patternRecognition.analyzePresenceData({
        contador: data.contador,
        device_id: data.device_id,
        timestamp: data.timestamp || Date.now()
      });

      // Emitir evento via Socket.IO para atualização em tempo real
      this.emitPresenceUpdate(data);

    } catch (error) {
      console.error('❌ Erro ao processar dados de presença:', error);
    }
  }

  /**
   * Processa dados de status
   */
  async handleStatusData(data) {
    try {
      console.log(`📊 Status do dispositivo ${data.device_id}:`, {
        status: data.status,
        contador: data.contador,
        wifi_rssi: data.wifi_rssi,
        uptime: data.uptime
      });

      // Emitir evento de status via Socket.IO
      this.emitStatusUpdate(data);

    } catch (error) {
      console.error('❌ Erro ao processar dados de status:', error);
    }
  }

  /**
   * Envia comando para o dispositivo
   */
  sendCommand(deviceId, command, data = {}) {
    if (!this.isConnected) {
      console.error('❌ MQTT não conectado');
      return false;
    }

    try {
      const message = {
        command: command,
        timestamp: Date.now(),
        ...data
      };

      const topic = `sala/${deviceId}/comando`;
      const payload = JSON.stringify(message);

      this.client.publish(topic, payload, (err) => {
        if (err) {
          console.error(`❌ Erro ao enviar comando para ${deviceId}:`, err);
        } else {
          console.log(`📤 Comando enviado para ${deviceId}: ${command}`);
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar comando:', error);
      return false;
    }
  }

  /**
   * Envia alerta para o dispositivo
   */
  sendAlert(deviceId, alertType, message) {
    return this.sendCommand(deviceId, 'ALERTA', {
      tipo: alertType,
      mensagem: message
    });
  }

  /**
   * Envia configuração para o dispositivo
   */
  sendConfig(deviceId, config) {
    return this.sendCommand(deviceId, 'CONFIG', config);
  }

  /**
   * Emite atualização de presença via Socket.IO
   */
  emitPresenceUpdate(data) {
    if (global.io) {
      global.io.emit('presence_update', {
        device_id: data.device_id,
        contador: data.contador,
        evento: data.evento,
        timestamp: new Date()
      });
    }
  }

  /**
   * Emite atualização de status via Socket.IO
   */
  emitStatusUpdate(data) {
    if (global.io) {
      global.io.emit('status_update', {
        device_id: data.device_id,
        status: data.status,
        contador: data.contador,
        wifi_rssi: data.wifi_rssi,
        uptime: data.uptime,
        timestamp: new Date()
      });
    }
  }

  /**
   * Emite alerta via Socket.IO
   */
  emitAlert(alert) {
    if (global.io) {
      global.io.emit('new_alert', {
        tipo: alert.tipo,
        titulo: alert.titulo,
        descricao: alert.descricao,
        contador: alert.contador,
        device_id: alert.device_id,
        timestamp: alert.timestamp
      });
    }
  }

  /**
   * Gerencia reconexão
   */
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
        this.connect();
      }, 5000 * (this.reconnectAttempts + 1));
    } else {
      console.error('❌ Máximo de tentativas de reconexão atingido');
    }
  }

  /**
   * Desconecta do MQTT
   */
  disconnect() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      console.log('🔌 Desconectado do MQTT');
    }
  }

  /**
   * Obtém status da conexão
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

module.exports = MQTTService;
