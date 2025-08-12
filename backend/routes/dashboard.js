const express = require('express');
const router = express.Router();
const Presenca = require('../models/Presenca');
const Alerta = require('../models/Alerta');
const moment = require('moment');

/**
 * GET /api/dashboard/overview
 * Obtém visão geral do dashboard
 */
router.get('/overview', async (req, res) => {
  try {
    const deviceId = req.query.device_id;
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'day').startOf('day');

    const filter = {};
    if (deviceId) {
      filter.device_id = deviceId;
    }

    // Dados de hoje
    const todayFilter = { ...filter, timestamp: { $gte: today.toDate() } };
    const todayStats = await Presenca.aggregate([
      { $match: todayFilter },
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
          avgOccupancy: { $avg: '$contador' }
        }
      }
    ]);

    // Dados de ontem
    const yesterdayFilter = { 
      ...filter, 
      timestamp: { 
        $gte: yesterday.toDate(), 
        $lt: today.toDate() 
      } 
    };
    const yesterdayStats = await Presenca.aggregate([
      { $match: yesterdayFilter },
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
          avgOccupancy: { $avg: '$contador' }
        }
      }
    ]);

    // Contador atual
    const currentFilter = deviceId ? { device_id: deviceId } : {};
    const currentData = await Presenca.findOne(currentFilter)
      .sort({ timestamp: -1 })
      .lean();

    // Alertas ativos
    const activeAlertsFilter = { status: 'ATIVO' };
    if (deviceId) {
      activeAlertsFilter.device_id = deviceId;
    }
    const activeAlerts = await Alerta.find(activeAlertsFilter)
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

    // Dispositivos ativos
    const activeDevices = await Presenca.aggregate([
      {
        $group: {
          _id: '$device_id',
          lastActivity: { $max: '$timestamp' },
          currentCount: { $last: '$contador' }
        }
      },
      {
        $project: {
          device_id: '$_id',
          lastActivity: 1,
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
      current: {
        contador: currentData?.contador || 0,
        device_id: currentData?.device_id || deviceId || 'N/A',
        ultima_atualizacao: currentData?.timestamp || null
      },
      today: todayStats[0] || {
        totalEntries: 0,
        totalExits: 0,
        maxOccupancy: 0,
        avgOccupancy: 0
      },
      yesterday: yesterdayStats[0] || {
        totalEntries: 0,
        totalExits: 0,
        maxOccupancy: 0,
        avgOccupancy: 0
      },
      activeAlerts: {
        count: activeAlerts.length,
        data: activeAlerts
      },
      devices: {
        total: activeDevices.length,
        active: activeDevices.filter(d => d.isActive).length,
        data: activeDevices
      }
    });

  } catch (error) {
    console.error('Erro ao buscar overview do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/dashboard/charts
 * Obtém dados para gráficos
 */
router.get('/charts', async (req, res) => {
  try {
    const deviceId = req.query.device_id;
    const days = parseInt(req.query.days) || 7;
    const startDate = moment().subtract(days, 'days').startOf('day');

    const filter = { timestamp: { $gte: startDate.toDate() } };
    if (deviceId) {
      filter.device_id = deviceId;
    }

    // Dados de ocupação por hora (últimas 24h)
    const hourlyData = await Presenca.aggregate([
      { $match: { ...filter, timestamp: { $gte: moment().subtract(24, 'hours').toDate() } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
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

    // Dados de ocupação por dia
    const dailyData = await Presenca.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          maxOccupancy: { $max: '$contador' },
          avgOccupancy: { $avg: '$contador' },
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

    // Dados de alertas por tipo
    const alertData = await Alerta.aggregate([
      { $match: { ...filter, timestamp: { $gte: startDate.toDate() } } },
      {
        $group: {
          _id: '$tipo',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'ATIVO'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Dados de movimento por hora do dia
    const movementByHour = await Presenca.aggregate([
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
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      hourly: hourlyData,
      daily: dailyData,
      alerts: alertData,
      movementByHour: movementByHour
    });

  } catch (error) {
    console.error('Erro ao buscar dados dos gráficos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/dashboard/realtime
 * Obtém dados em tempo real
 */
router.get('/realtime', async (req, res) => {
  try {
    const deviceId = req.query.device_id;
    const minutes = parseInt(req.query.minutes) || 5;
    const startTime = moment().subtract(minutes, 'minutes');

    const filter = { timestamp: { $gte: startTime.toDate() } };
    if (deviceId) {
      filter.device_id = deviceId;
    }

    // Últimas atividades
    const recentActivity = await Presenca.find(filter)
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    // Últimos alertas
    const recentAlerts = await Alerta.find({
      timestamp: { $gte: startTime.toDate() }
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Status dos dispositivos
    const deviceStatus = await Presenca.aggregate([
      {
        $group: {
          _id: '$device_id',
          lastActivity: { $max: '$timestamp' },
          currentCount: { $last: '$contador' },
          lastEvent: { $last: '$evento' }
        }
      },
      {
        $project: {
          device_id: '$_id',
          lastActivity: 1,
          currentCount: 1,
          lastEvent: 1,
          isOnline: {
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
      period: `${minutes} minutos`,
      activity: recentActivity,
      alerts: recentAlerts,
      devices: deviceStatus
    });

  } catch (error) {
    console.error('Erro ao buscar dados em tempo real:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/dashboard/analytics
 * Obtém análises avançadas
 */
router.get('/analytics', async (req, res) => {
  try {
    const deviceId = req.query.device_id;
    const days = parseInt(req.query.days) || 30;
    const startDate = moment().subtract(days, 'days').startOf('day');

    const filter = { timestamp: { $gte: startDate.toDate() } };
    if (deviceId) {
      filter.device_id = deviceId;
    }

    // Padrões de uso por dia da semana
    const weekdayPatterns = await Presenca.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%u', date: '$timestamp' } // 1=Segunda, 7=Domingo
          },
          avgOccupancy: { $avg: '$contador' },
          maxOccupancy: { $max: '$contador' },
          totalEntries: {
            $sum: { $cond: [{ $eq: ['$evento', 'ENTRADA'] }, 1, 0] }
          },
          totalExits: {
            $sum: { $cond: [{ $eq: ['$evento', 'SAIDA'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Horários de pico
    const peakHours = await Presenca.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%H', date: '$timestamp' }
          },
          avgOccupancy: { $avg: '$contador' },
          maxOccupancy: { $max: '$contador' },
          activityCount: { $sum: 1 }
        }
      },
      { $sort: { avgOccupancy: -1 } },
      { $limit: 5 }
    ]);

    // Duração média de permanência (estimativa)
    const stayDuration = await Presenca.aggregate([
      { $match: { ...filter, evento: 'ENTRADA' } },
      {
        $lookup: {
          from: 'presencas',
          let: { 
            device: '$device_id', 
            entryTime: '$timestamp',
            entryCount: '$contador'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$device_id', '$$device'] },
                    { $gt: ['$timestamp', '$$entryTime'] },
                    { $lt: ['$contador', '$$entryCount'] }
                  ]
                }
              }
            },
            { $sort: { timestamp: 1 } },
            { $limit: 1 }
          ],
          as: 'exit'
        }
      },
      {
        $project: {
          duration: {
            $cond: {
              if: { $gt: [{ $size: '$exit' }, 0] },
              then: {
                $divide: [
                  { $subtract: [{ $arrayElemAt: ['$exit.timestamp', 0] }, '$timestamp'] },
                  60000 // Converter para minutos
                ]
              },
              else: null
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
          maxDuration: { $max: '$duration' },
          minDuration: { $min: '$duration' }
        }
      }
    ]);

    // Eficiência de uso da sala
    const roomEfficiency = await Presenca.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          maxOccupancy: { $max: '$contador' },
          avgOccupancy: { $avg: '$contador' },
          totalTime: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          maxOccupancy: 1,
          avgOccupancy: 1,
          efficiency: {
            $multiply: [
              { $divide: ['$avgOccupancy', '$maxOccupancy'] },
              100
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ]);

    res.json({
      period: `${days} dias`,
      weekdayPatterns: weekdayPatterns.map(w => ({
        ...w,
        dayName: moment().day(w._id).format('dddd')
      })),
      peakHours: peakHours,
      stayDuration: stayDuration[0] || {
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0
      },
      roomEfficiency: roomEfficiency
    });

  } catch (error) {
    console.error('Erro ao buscar análises:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
