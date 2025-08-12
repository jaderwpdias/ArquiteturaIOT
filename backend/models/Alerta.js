const mongoose = require('mongoose');

const alertaSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: ['OCUPACAO_MAXIMA', 'SALA_OCIOSA', 'PERMANENCIA_ANOMAL', 'PADRAO_HORARIO']
  },
  titulo: {
    type: String,
    required: true
  },
  descricao: {
    type: String,
    required: true
  },
  contador: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  device_id: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['ATIVO', 'RESOLVIDO', 'IGNORADO'],
    default: 'ATIVO'
  },
  email_enviado: {
    type: Boolean,
    default: false
  },
  email_timestamp: {
    type: Date,
    default: null
  },
  dados_extras: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices para otimização
alertaSchema.index({ timestamp: -1 });
alertaSchema.index({ tipo: 1, status: 1 });
alertaSchema.index({ device_id: 1, timestamp: -1 });

// Método para marcar como resolvido
alertaSchema.methods.resolver = function() {
  this.status = 'RESOLVIDO';
  return this.save();
};

// Método para marcar email como enviado
alertaSchema.methods.marcarEmailEnviado = function() {
  this.email_enviado = true;
  this.email_timestamp = new Date();
  return this.save();
};

module.exports = mongoose.model('Alerta', alertaSchema);
