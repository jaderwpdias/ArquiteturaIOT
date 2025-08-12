const express = require('express');
const router = express.Router();
const Alerta = require('../models/Alerta');
const moment = require('moment');

/**
 * GET /api/alerta
 * Lista todos os alertas com paginação
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const deviceId = req.query.device_id;
    const tipo = req.query.tipo;
    const status = req.query.status;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    // Construir filtros
    const filter = {};
    
    if (deviceId) {
      filter.device_id = deviceId;
    }
    
    if (tipo) {
      filter.tipo = tipo;
    }
    
    if (status) {
      filter.status = status;
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
    
    const alertas = await Alerta.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Alerta.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: alertas,
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
    console.error('Erro ao buscar alertas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/alerta/active
 * Lista alertas ativos
 */
router.get('/active', async (req, res) => {
  try {
    const deviceId = req.query.device_id;
    
    const filter = { status: 'ATIVO' };
    if (deviceId) {
      filter.device_id = deviceId;
    }

    const alertas = await Alerta.find(filter)
      .sort({ timestamp: -1 })
      .lean();

    res.json({
      data: alertas,
      count: alertas.length
    });

  } catch (error) {
    console.error('Erro ao buscar alertas ativos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/alerta/stats
 * Obtém estatísticas de alertas
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

    // Estatísticas por tipo
    const statsByType = await Alerta.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$tipo',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'ATIVO'] }, 1, 0] }
          },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'RESOLVIDO'] }, 1, 0] }
          },
          lastOccurrence: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Estatísticas por status
    const statsByStatus = await Alerta.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Estatísticas por dia
    const dailyStats = await Alerta.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'ATIVO'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      period: `${days} dias`,
      device_id: deviceId || 'Todos',
      byType: statsByType,
      byStatus: statsByStatus,
      daily: dailyStats
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas de alertas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/alerta/:id
 * Obtém um alerta específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const alerta = await Alerta.findById(id).lean();
    
    if (!alerta) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    res.json({
      data: alerta
    });

  } catch (error) {
    console.error('Erro ao buscar alerta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PATCH /api/alerta/:id/resolve
 * Marca um alerta como resolvido
 */
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const alerta = await Alerta.findById(id);
    
    if (!alerta) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    await alerta.resolver();

    res.json({
      message: 'Alerta marcado como resolvido',
      data: alerta
    });

  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PATCH /api/alerta/:id/ignore
 * Marca um alerta como ignorado
 */
router.patch('/:id/ignore', async (req, res) => {
  try {
    const { id } = req.params;
    
    const alerta = await Alerta.findById(id);
    
    if (!alerta) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    alerta.status = 'IGNORADO';
    await alerta.save();

    res.json({
      message: 'Alerta marcado como ignorado',
      data: alerta
    });

  } catch (error) {
    console.error('Erro ao ignorar alerta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/alerta/:id
 * Remove um alerta
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const alerta = await Alerta.findByIdAndDelete(id);
    
    if (!alerta) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    res.json({
      message: 'Alerta removido com sucesso',
      data: alerta
    });

  } catch (error) {
    console.error('Erro ao remover alerta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/alerta/test
 * Cria um alerta de teste
 */
router.post('/test', async (req, res) => {
  try {
    const { tipo, device_id, contador } = req.body;

    // Validações
    if (!tipo || !device_id) {
      return res.status(400).json({
        error: 'Dados obrigatórios: tipo, device_id'
      });
    }

    if (!['OCUPACAO_MAXIMA', 'SALA_OCIOSA', 'PERMANENCIA_ANOMAL', 'PADRAO_HORARIO'].includes(tipo)) {
      return res.status(400).json({
        error: 'Tipo deve ser OCUPACAO_MAXIMA, SALA_OCIOSA, PERMANENCIA_ANOMAL ou PADRAO_HORARIO'
      });
    }

    const titulos = {
      'OCUPACAO_MAXIMA': 'Teste: Ocupação Máxima',
      'SALA_OCIOSA': 'Teste: Sala Ociosa',
      'PERMANENCIA_ANOMAL': 'Teste: Permanência Anormal',
      'PADRAO_HORARIO': 'Teste: Padrão de Horário'
    };

    const alerta = new Alerta({
      tipo: tipo,
      titulo: titulos[tipo],
      descricao: `Alerta de teste - ${tipo}`,
      contador: contador || 0,
      device_id: device_id,
      timestamp: new Date(),
      status: 'ATIVO'
    });

    await alerta.save();

    res.status(201).json({
      message: 'Alerta de teste criado com sucesso',
      data: alerta
    });

  } catch (error) {
    console.error('Erro ao criar alerta de teste:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/alerta/bulk-resolve
 * Marca múltiplos alertas como resolvidos
 */
router.post('/bulk-resolve', async (req, res) => {
  try {
    const { ids, device_id, tipo } = req.body;

    const filter = {};
    
    if (ids && ids.length > 0) {
      filter._id = { $in: ids };
    } else if (device_id) {
      filter.device_id = device_id;
    } else if (tipo) {
      filter.tipo = tipo;
    } else {
      return res.status(400).json({
        error: 'Deve fornecer ids, device_id ou tipo'
      });
    }

    filter.status = 'ATIVO';

    const result = await Alerta.updateMany(filter, {
      status: 'RESOLVIDO'
    });

    res.json({
      message: `${result.modifiedCount} alertas marcados como resolvidos`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Erro ao resolver alertas em lote:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
