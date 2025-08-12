require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');

// Importar serviços
const MQTTService = require('./services/MQTTService');
const EmailService = require('./services/EmailService');

// Importar modelos
const Presenca = require('./models/Presenca');
const Alerta = require('./models/Alerta');

// Importar rotas
const presencaRoutes = require('./routes/presenca');
const alertaRoutes = require('./routes/alerta');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Configurações globais
global.io = io;

// Middleware de segurança
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limite por IP
  message: 'Muitas requisições deste IP, tente novamente mais tarde.'
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Conectado ao MongoDB');
})
.catch((error) => {
  console.error('❌ Erro ao conectar MongoDB:', error);
  process.exit(1);
});

// Inicializar serviços
const mqttService = new MQTTService();
const emailService = new EmailService();

// Conectar ao MQTT
mqttService.connect();

// Testar conexão de email
emailService.testConnection();

// Rotas da API
app.use('/api/presenca', presencaRoutes);
app.use('/api/alerta', alertaRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    mqtt: mqttService.getConnectionStatus(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Rota de configuração
app.get('/api/config', (req, res) => {
  res.json({
    maxOccupancy: parseInt(process.env.MAX_OCCUPANCY) || 5,
    idleTimeout: parseInt(process.env.IDLE_TIMEOUT) || 1800000,
    anomalyTimeout: parseInt(process.env.ANOMALY_TIMEOUT) || 7200000,
    adminEmail: process.env.ADMIN_EMAIL,
    managerEmail: process.env.MANAGER_EMAIL
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // Enviar dados iniciais
  socket.emit('connected', {
    message: 'Conectado ao servidor de presença',
    timestamp: new Date()
  });

  // Join room para dispositivo específico
  socket.on('join_device', (deviceId) => {
    socket.join(`device_${deviceId}`);
    console.log(`📱 Cliente ${socket.id} entrou na sala do dispositivo ${deviceId}`);
  });

  // Leave room
  socket.on('leave_device', (deviceId) => {
    socket.leave(`device_${deviceId}`);
    console.log(`📱 Cliente ${socket.id} saiu da sala do dispositivo ${deviceId}`);
  });

  // Comando manual
  socket.on('send_command', async (data) => {
    try {
      const { deviceId, command, payload } = data;
      const success = mqttService.sendCommand(deviceId, command, payload);
      
      socket.emit('command_result', {
        success,
        deviceId,
        command,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('command_result', {
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  });

  // Resolver alerta
  socket.on('resolve_alert', async (alertId) => {
    try {
      const alerta = await Alerta.findById(alertId);
      if (alerta) {
        await alerta.resolver();
        io.emit('alert_resolved', { alertId, timestamp: new Date() });
      }
    } catch (error) {
      socket.emit('error', { message: 'Erro ao resolver alerta', error: error.message });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  mqttService.disconnect();
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  mqttService.disconnect();
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Dashboard disponível em: http://localhost:${PORT}`);
  console.log(`🔧 API disponível em: http://localhost:${PORT}/api`);
});

module.exports = app;
