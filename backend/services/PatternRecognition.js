const Presenca = require('../models/Presenca');
const Alerta = require('../models/Alerta');
const EmailService = require('./EmailService');
const moment = require('moment');

class PatternRecognition {
  constructor() {
    this.maxOccupancy = parseInt(process.env.MAX_OCCUPANCY) || 5;
    this.idleTimeout = parseInt(process.env.IDLE_TIMEOUT) || 1800000; // 30 min
    this.anomalyTimeout = parseInt(process.env.ANOMALY_TIMEOUT) || 7200000; // 2h
    this.lastOccupancyCheck = {};
    this.lastIdleCheck = {};
    this.lastAnomalyCheck = {};
  }

  /**
   * Analisa dados de presença e reconhece padrões
   */
  async analyzePresenceData(data) {
    try {
      const { contador, device_id, timestamp } = data;
      
      // Verificar ocupação máxima
      await this.checkMaxOccupancy(contador, device_id, timestamp);
      
      // Verificar sala ociosa
      await this.checkIdleRoom(contador, device_id, timestamp);
      
      // Verificar permanência anormal
      await this.checkAnomalousPresence(contador, device_id, timestamp);
      
      // Verificar padrões de horário
      await this.checkTimePatterns(contador, device_id, timestamp);
      
    } catch (error) {
      console.error('Erro na análise de padrões:', error);
    }
  }

  /**
   * Reconhece ocupação máxima
   */
  async checkMaxOccupancy(contador, device_id, timestamp) {
    if (contador > this.maxOccupancy) {
      const lastCheck = this.lastOccupancyCheck[device_id] || 0;
      const timeSinceLastCheck = timestamp - lastCheck;
      
      // Evitar múltiplos alertas em sequência
      if (timeSinceLastCheck > 300000) { // 5 minutos
        const alerta = new Alerta({
          tipo: 'OCUPACAO_MAXIMA',
          titulo: 'Ocupação Máxima Detectada',
          descricao: `A sala atingiu ${contador} pessoas, ultrapassando o limite de ${this.maxOccupancy}`,
          contador: contador,
          device_id: device_id,
          timestamp: new Date(timestamp),
          dados_extras: {
            limite_maximo: this.maxOccupancy,
            excedeu_por: contador - this.maxOccupancy
          }
        });

        await alerta.save();
        this.lastOccupancyCheck[device_id] = timestamp;
        
        // Enviar email de alerta
        await this.sendOccupancyAlert(alerta);
        
        console.log(`Alerta de ocupação máxima: ${contador} pessoas`);
      }
    }
  }

  /**
   * Reconhece sala ociosa
   */
  async checkIdleRoom(contador, device_id, timestamp) {
    if (contador === 0) {
      const lastCheck = this.lastIdleCheck[device_id] || 0;
      const timeSinceLastCheck = timestamp - lastCheck;
      
      if (timeSinceLastCheck > this.idleTimeout) {
        // Verificar se já existe alerta ativo
        const alertaExistente = await Alerta.findOne({
          device_id: device_id,
          tipo: 'SALA_OCIOSA',
          status: 'ATIVO'
        });

        if (!alertaExistente) {
          const alerta = new Alerta({
            tipo: 'SALA_OCIOSA',
            titulo: 'Sala Ociosa Detectada',
            descricao: `A sala está vazia há mais de ${this.idleTimeout / 60000} minutos`,
            contador: contador,
            device_id: device_id,
            timestamp: new Date(timestamp),
            dados_extras: {
              tempo_ocioso: this.idleTimeout / 60000,
              ultima_atividade: new Date(lastCheck)
            }
          });

          await alerta.save();
          this.lastIdleCheck[device_id] = timestamp;
          
          // Enviar email de alerta
          await this.sendIdleAlert(alerta);
          
          console.log(`Alerta de sala ociosa: ${this.idleTimeout / 60000} minutos`);
        }
      }
    } else {
      // Reset do timer de ociosidade
      this.lastIdleCheck[device_id] = timestamp;
      
      // Resolver alertas de ociosidade ativos
      await Alerta.updateMany(
        {
          device_id: device_id,
          tipo: 'SALA_OCIOSA',
          status: 'ATIVO'
        },
        {
          status: 'RESOLVIDO'
        }
      );
    }
  }

  /**
   * Reconhece permanência anormal
   */
  async checkAnomalousPresence(contador, device_id, timestamp) {
    if (contador === 1) {
      const lastCheck = this.lastAnomalyCheck[device_id] || 0;
      const timeSinceLastCheck = timestamp - lastCheck;
      
      if (timeSinceLastCheck > this.anomalyTimeout) {
        const alertaExistente = await Alerta.findOne({
          device_id: device_id,
          tipo: 'PERMANENCIA_ANOMAL',
          status: 'ATIVO'
        });

        if (!alertaExistente) {
          const alerta = new Alerta({
            tipo: 'PERMANENCIA_ANOMAL',
            titulo: 'Permanência Anormal Detectada',
            descricao: `Uma pessoa está sozinha na sala há mais de ${this.anomalyTimeout / 3600000} horas`,
            contador: contador,
            device_id: device_id,
            timestamp: new Date(timestamp),
            dados_extras: {
              tempo_permanencia: this.anomalyTimeout / 3600000,
              inicio_permanencia: new Date(lastCheck)
            }
          });

          await alerta.save();
          this.lastAnomalyCheck[device_id] = timestamp;
          
          // Enviar email de alerta
          await this.sendAnomalyAlert(alerta);
          
          console.log(`Alerta de permanência anormal: ${this.anomalyTimeout / 3600000} horas`);
        }
      }
    } else {
      // Reset do timer de permanência
      this.lastAnomalyCheck[device_id] = timestamp;
      
      // Resolver alertas de permanência ativos
      await Alerta.updateMany(
        {
          device_id: device_id,
          tipo: 'PERMANENCIA_ANOMAL',
          status: 'ATIVO'
        },
        {
          status: 'RESOLVIDO'
        }
      );
    }
  }

  /**
   * Reconhece padrões de horário
   */
  async checkTimePatterns(contador, device_id, timestamp) {
    const hora = moment(timestamp).hour();
    const diaSemana = moment(timestamp).day();
    
    // Verificar se é horário comercial (8h às 18h, segunda a sexta)
    const isHorarioComercial = hora >= 8 && hora <= 18 && diaSemana >= 1 && diaSemana <= 5;
    
    if (isHorarioComercial && contador === 0) {
      // Sala vazia durante horário comercial pode ser anormal
      const alertaExistente = await Alerta.findOne({
        device_id: device_id,
        tipo: 'PADRAO_HORARIO',
        status: 'ATIVO',
        'dados_extras.dia_semana': diaSemana
      });

      if (!alertaExistente) {
        const alerta = new Alerta({
          tipo: 'PADRAO_HORARIO',
          titulo: 'Padrão de Horário Anormal',
          descricao: `Sala vazia durante horário comercial (${hora}h, ${moment().format('dddd')})`,
          contador: contador,
          device_id: device_id,
          timestamp: new Date(timestamp),
          dados_extras: {
            hora: hora,
            dia_semana: diaSemana,
            horario_comercial: true
          }
        });

        await alerta.save();
        
        // Enviar email de alerta
        await this.sendTimePatternAlert(alerta);
        
        console.log(`Alerta de padrão de horário: ${hora}h, ${moment().format('dddd')}`);
      }
    }
  }

  /**
   * Envia alerta de ocupação máxima
   */
  async sendOccupancyAlert(alerta) {
    try {
      const emailService = new EmailService();
      await emailService.sendAlertEmail(
        process.env.ADMIN_EMAIL,
        'Alerta: Ocupação Máxima na Sala',
        `A sala atingiu ${alerta.contador} pessoas, ultrapassando o limite de ${alerta.dados_extras.limite_maximo} pessoas.`,
        alerta
      );
      await alerta.marcarEmailEnviado();
    } catch (error) {
      console.error('Erro ao enviar email de ocupação:', error);
    }
  }

  /**
   * Envia alerta de sala ociosa
   */
  async sendIdleAlert(alerta) {
    try {
      const emailService = new EmailService();
      await emailService.sendAlertEmail(
        process.env.MANAGER_EMAIL,
        'Alerta: Sala Ociosa',
        `A sala está vazia há mais de ${alerta.dados_extras.tempo_ocioso} minutos.`,
        alerta
      );
      await alerta.marcarEmailEnviado();
    } catch (error) {
      console.error('Erro ao enviar email de ociosidade:', error);
    }
  }

  /**
   * Envia alerta de permanência anormal
   */
  async sendAnomalyAlert(alerta) {
    try {
      const emailService = new EmailService();
      await emailService.sendAlertEmail(
        process.env.ADMIN_EMAIL,
        'Alerta: Permanência Anormal',
        `Uma pessoa está sozinha na sala há mais de ${alerta.dados_extras.tempo_permanencia} horas.`,
        alerta
      );
      await alerta.marcarEmailEnviado();
    } catch (error) {
      console.error('Erro ao enviar email de permanência:', error);
    }
  }

  /**
   * Envia alerta de padrão de horário
   */
  async sendTimePatternAlert(alerta) {
    try {
      const emailService = new EmailService();
      await emailService.sendAlertEmail(
        process.env.MANAGER_EMAIL,
        'Alerta: Padrão de Horário Anormal',
        `Sala vazia durante horário comercial (${alerta.dados_extras.hora}h, ${moment(alerta.timestamp).format('dddd')}).`,
        alerta
      );
      await alerta.marcarEmailEnviado();
    } catch (error) {
      console.error('Erro ao enviar email de padrão de horário:', error);
    }
  }

  /**
   * Obtém estatísticas de padrões
   */
  async getPatternStats(device_id, days = 7) {
    const startDate = moment().subtract(days, 'days').toDate();
    
    const stats = await Alerta.aggregate([
      {
        $match: {
          device_id: device_id,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$tipo',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$timestamp' }
        }
      }
    ]);

    return stats;
  }
}

module.exports = PatternRecognition;
