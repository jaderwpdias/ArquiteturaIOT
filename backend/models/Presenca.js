const mongoose = require('mongoose');

const presencaSchema = new mongoose.Schema({
  contador: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  evento: {
    type: String,
    required: true,
    enum: ['ENTRADA', 'SAIDA', 'HEARTBEAT']
  },
  sensor: {
    type: Number,
    required: true,
    min: 1,
    max: 2
  },
  device_id: {
    type: String,
    required: true
  },
  wifi_rssi: {
    type: Number,
    default: null
  },
  uptime: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

// Índices para otimização de consultas
presencaSchema.index({ timestamp: -1 });
presencaSchema.index({ device_id: 1, timestamp: -1 });
presencaSchema.index({ evento: 1, timestamp: -1 });

module.exports = mongoose.model('Presenca', presencaSchema);
