const nodemailer = require('nodemailer');
const moment = require('moment');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true para 465, false para outras portas
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  /**
   * Envia email de alerta
   */
  async sendAlertEmail(to, subject, message, alerta) {
    try {
      const htmlContent = this.generateAlertHTML(subject, message, alerta);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: to,
        subject: subject,
        text: message,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email enviado:', info.messageId);
      return info;
      
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  /**
   * Gera HTML para email de alerta
   */
  generateAlertHTML(subject, message, alerta) {
    const alertaColors = {
      'OCUPACAO_MAXIMA': '#ff4444',
      'SALA_OCIOSA': '#ff8800',
      'PERMANENCIA_ANOMAL': '#ff4444',
      'PADRAO_HORARIO': '#ff8800'
    };

    const color = alertaColors[alerta.tipo] || '#ff4444';
    const timestamp = moment(alerta.timestamp).format('DD/MM/YYYY HH:mm:ss');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: ${color};
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
          }
          .alert-info {
            background-color: #e3f2fd;
            border-left: 4px solid ${color};
            padding: 15px;
            margin: 15px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: ${color};
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 Sistema de Alertas</h1>
          <p>${subject}</p>
        </div>
        
        <div class="content">
          <div class="alert-info">
            <h3>${alerta.titulo}</h3>
            <p><strong>Descrição:</strong> ${alerta.descricao}</p>
            <p><strong>Contador de Pessoas:</strong> ${alerta.contador}</p>
            <p><strong>Data/Hora:</strong> ${timestamp}</p>
            <p><strong>Dispositivo:</strong> ${alerta.device_id}</p>
          </div>
          
          <p>${message}</p>
          
          <p><strong>Ações Recomendadas:</strong></p>
          <ul>
            ${this.getRecommendedActions(alerta.tipo)}
          </ul>
          
          <a href="http://localhost:3000/dashboard" class="button">
            Acessar Dashboard
          </a>
        </div>
        
        <div class="footer">
          <p>Este é um alerta automático do Sistema de Contador de Presença</p>
          <p>Enviado em: ${timestamp}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Retorna ações recomendadas baseadas no tipo de alerta
   */
  getRecommendedActions(tipo) {
    const actions = {
      'OCUPACAO_MAXIMA': [
        'Verificar se há necessidade de limitar o acesso',
        'Considerar redistribuir pessoas para outras salas',
        'Avaliar se o limite atual é adequado'
      ],
      'SALA_OCIOSA': [
        'Verificar se há atividades programadas',
        'Considerar desligar equipamentos para economia',
        'Avaliar se o horário está correto'
      ],
      'PERMANENCIA_ANOMAL': [
        'Verificar se a pessoa está bem',
        'Confirmar se há necessidade de apoio',
        'Considerar verificação de segurança'
      ],
      'PADRAO_HORARIO': [
        'Verificar agenda de atividades',
        'Confirmar se há reuniões canceladas',
        'Avaliar padrões de uso da sala'
      ]
    };

    const actionList = actions[tipo] || ['Verificar situação', 'Tomar ação apropriada'];
    
    return actionList.map(action => `<li>${action}</li>`).join('');
  }

  /**
   * Envia email de resumo diário
   */
  async sendDailyReport(to, reportData) {
    try {
      const subject = 'Relatório Diário - Sistema de Presença';
      const htmlContent = this.generateDailyReportHTML(reportData);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: to,
        subject: subject,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Relatório diário enviado:', info.messageId);
      return info;
      
    } catch (error) {
      console.error('Erro ao enviar relatório diário:', error);
      throw error;
    }
  }

  /**
   * Gera HTML para relatório diário
   */
  generateDailyReportHTML(reportData) {
    const { date, totalEntries, totalExits, maxOccupancy, alerts, deviceStats } = reportData;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #2196F3;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
          }
          .stat-card {
            background-color: white;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #2196F3;
            text-align: center;
          }
          .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #2196F3;
          }
          .alert-list {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Relatório Diário</h1>
          <p>${moment(date).format('DD/MM/YYYY')}</p>
        </div>
        
        <div class="content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${totalEntries}</div>
              <div>Entradas</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${totalExits}</div>
              <div>Saídas</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${maxOccupancy}</div>
              <div>Ocupação Máxima</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${alerts.length}</div>
              <div>Alertas</div>
            </div>
          </div>
          
          ${alerts.length > 0 ? `
            <div class="alert-list">
              <h3>🚨 Alertas do Dia</h3>
              <ul>
                ${alerts.map(alert => `<li>${alert.titulo} - ${moment(alert.timestamp).format('HH:mm')}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          <a href="http://localhost:3000/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px;">
            Acessar Dashboard Completo
          </a>
        </div>
        
        <div class="footer">
          <p>Relatório gerado automaticamente pelo Sistema de Contador de Presença</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Testa a conexão de email
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Conexão de email verificada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro na verificação de email:', error);
      return false;
    }
  }
}

module.exports = EmailService;
