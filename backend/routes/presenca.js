const express = require('express');
const router = express.Router();
const Presenca = require('../models/Presenca');
const moment = require('moment');

/**
 * GET /api/presenca
 * Lista todas as presenças com paginação
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const deviceId = req.query.device_id;
    const evento = req.query.evento;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    // Construir filtros
    const filter = {};
    
    if (deviceId) {
      filter.device_id = deviceId;
    }
    
    if (evento) {
      filter.evento = evento;
    }
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    // Executar consulta com paginação
    const skip = (page - 1) * limit;
    
    const presencas = await Presenca.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Presenca.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: presencas,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Erro ao buscar presenças:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/presenca/current
 * Obtém o contador atual de pessoas
 */
router.get('/current', async (req, res) => {
  try {
    const deviceId = req.query.device_id;

    // Buscar a última entrada de presença
    const filter = deviceId ? { device_id: deviceId } : {};
    
    const ultimaPresenca = await Presenca.findOne(filter)
      .sort({ timestamp: -1 })
      .lean();

    if (!ultimaPresenca) {
      return res.json({
        contador: 0,
        device_id: deviceId || 'N/A',
        ultima_atualizacao: null
      });
    }

    res.json({
      contador: ultimaPresenca.contador,
      device_id: ultimaPresenca.device_id,
      ultima_atualizacao: ultimaPresenca.timestamp,
      evento: ultimaPresenca.evento
    });

  } catch (error) {
    console.error('Erro ao buscar contador atual:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/presenca/stats
 * Obtém estatísticas de presença
 */
router.get('/stats', async (req, res) => {
  try {
    const deviceId = req.query.device_id;
    const days = parseInt(req.query.days) || 7;
    const startDate = moment().subtract(days, 'days').toDate();

    const filter = { timestamp: { $gte: startDate } };
    if (deviceId) {
      filter.device_id = deviceId;
    }

    // Estatísticas gerais
    const stats = await Presenca.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEntries: {
            $sum: { $cond: [{ $eq: ['$evento', 'ENTRADA'] }, 1, 0] }
          },
          totalExits: {
            $sum: { $cond: [{ $eq: ['$evento', 'SAIDA'] }, 1, 0] }
          },
          maxOccupancy: { $max: '$contador' },
          avgOccupancy: { $avg: '$contador' },
          totalRecords: { $sum: 1 }
        }
      }
    ]);

    // Estatísticas por dia
    const dailyStats = await Presenca.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          entries: {
            $sum: { $cond: [{ $eq: ['$evento', 'ENTRADA'] }, 1, 0] }
          },
          exits: {
            $sum: { $cond: [{ $eq: ['$evento', 'SAIDA'] }, 1, 0] }
          },
          maxOccupancy: { $max: '$contador' },
          avgOccupancy: { $avg: '$contador' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Estatísticas por hora
    const hourlyStats = await Presenca.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%H', date: '$timestamp' }
          },
          entries: {
            $sum: { $cond: [{ $eq: ['$evento', 'ENTRADA'] }, 1, 0] }
          },
          exits: {
            $sum: { $cond: [{ $eq: ['$evento', 'SAIDA'] }, 1, 0] }
          },
          avgOccupancy: { $avg: '$contador' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      period: `${days} dias`,
      device_id: deviceId || 'Todos',
      general: stats[0] || {
        totalEntries: 0,
        totalExits: 0,
        maxOccupancy: 0,
        avgOccupancy: 0,
        totalRecords: 0
      },
      daily: dailyStats,
      hourly: hourlyStats
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/presenca/history
 * Obtém histórico de presença para gráficos
 */
router.get('/history', async (req, res) => {
  try {
    const deviceId = req.query.device_id;
    const hours = parseInt(req.query.hours) || 24;
    const interval = parseInt(req.query.interval) || 15; // minutos

    const startDate = moment().subtract(hours, 'hours').toDate();
    const filter = { timestamp: { $gte: startDate } };
    
    if (deviceId) {
      filter.device_id = deviceId;
    }

    const history = await Presenca.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:%M',
              date: {
                $dateTrunc: {
                  date: '$timestamp',
                  unit: 'minute',
                  binSize: interval
                }
              }
            }
          },
          contador: { $last: '$contador' },
          entries: {
            $sum: { $cond: [{ $eq: ['$evento', 'ENTRADA'] }, 1, 0] }
          },
          exits: {
            $sum: { $cond: [{ $eq: ['$evento', 'SAIDA'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      period: `${hours} horas`,
      interval: `${interval} minutos`,
      device_id: deviceId || 'Todos',
      data: history
    });

  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/presenca
 * Cria uma nova entrada de presença (para testes)
 */
router.post('/', async (req, res) => {
  try {
    const { contador, evento, device_id, sensor } = req.body;

    // Validações
    if (!contador || !evento || !device_id) {
      return res.status(400).json({
        error: 'Dados obrigatórios: contador, evento, device_id'
      });
    }

    if (!['ENTRADA', 'SAIDA', 'HEARTBEAT'].includes(evento)) {
      return res.status(400).json({
        error: 'Evento deve ser ENTRADA, SAIDA ou HEARTBEAT'
      });
    }

    const presenca = new Presenca({
      contador: parseInt(contador),
      evento: evento,
      device_id: device_id,
      sensor: sensor || 1,
      timestamp: new Date()
    });

    await presenca.save();

    res.status(201).json({
      message: 'Presença registrada com sucesso',
      data: presenca
    });

  } catch (error) {
    console.error('Erro ao criar presença:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/presenca/:id
 * Remove uma entrada de presença
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const presenca = await Presenca.findByIdAndDelete(id);
    
    if (!presenca) {
      return res.status(404).json({ error: 'Presença não encontrada' });
    }

    res.json({
      message: 'Presença removida com sucesso',
      data: presenca
    });

  } catch (error) {
    console.error('Erro ao remover presença:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/presenca/devices
 * Lista todos os dispositivos ativos
 */
router.get('/devices', async (req, res) => {
  try {
    const devices = await Presenca.aggregate([
      {
        $group: {
          _id: '$device_id',
          lastActivity: { $max: '$timestamp' },
          totalRecords: { $sum: 1 },
          currentCount: { $last: '$contador' }
        }
      },
      {
        $project: {
          device_id: '$_id',
          lastActivity: 1,
          totalRecords: 1,
          currentCount: 1,
          isActive: {
            $gte: [
              { $subtract: [new Date(), '$lastActivity'] },
              -300000 // 5 minutos
            ]
          }
        }
      },
      { $sort: { lastActivity: -1 } }
    ]);

    res.json({
      devices: devices
    });

  } catch (error) {
    console.error('Erro ao buscar dispositivos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
