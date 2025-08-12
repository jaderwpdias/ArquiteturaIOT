# Documentação da API - Sistema de Contador de Presença

## 📋 Visão Geral

A API REST do sistema de contador de presença fornece endpoints para gerenciar dados de presença, alertas e configurações do sistema.

**Base URL:** `http://localhost:3001/api`

## 🔐 Autenticação

Atualmente, a API não requer autenticação para desenvolvimento. Para produção, recomenda-se implementar JWT ou API keys.

## 📊 Endpoints

### Presença

#### GET /presenca
Lista todas as presenças com paginação.

**Parâmetros de Query:**
- `page` (number, opcional): Página atual (padrão: 1)
- `limit` (number, opcional): Itens por página (padrão: 50)
- `device_id` (string, opcional): Filtrar por dispositivo
- `evento` (string, opcional): Filtrar por evento (ENTRADA, SAIDA, HEARTBEAT)
- `start_date` (string, opcional): Data inicial (YYYY-MM-DD)
- `end_date` (string, opcional): Data final (YYYY-MM-DD)

**Exemplo:**
```bash
curl "http://localhost:3001/api/presenca?page=1&limit=10&device_id=ESP32_Presenca_001"
```

**Resposta:**
```json
{
  "data": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "contador": 3,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "evento": "ENTRADA",
      "sensor": 1,
      "device_id": "ESP32_Presenca_001",
      "wifi_rssi": -45,
      "uptime": 3600000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET /presenca/current
Obtém o contador atual de pessoas.

**Parâmetros de Query:**
- `device_id` (string, opcional): ID do dispositivo

**Exemplo:**
```bash
curl "http://localhost:3001/api/presenca/current?device_id=ESP32_Presenca_001"
```

**Resposta:**
```json
{
  "contador": 3,
  "device_id": "ESP32_Presenca_001",
  "ultima_atualizacao": "2024-01-15T10:30:00.000Z",
  "evento": "ENTRADA"
}
```

#### GET /presenca/stats
Obtém estatísticas de presença.

**Parâmetros de Query:**
- `device_id` (string, opcional): ID do dispositivo
- `days` (number, opcional): Período em dias (padrão: 7)

**Exemplo:**
```bash
curl "http://localhost:3001/api/presenca/stats?days=30&device_id=ESP32_Presenca_001"
```

**Resposta:**
```json
{
  "period": "30 dias",
  "device_id": "ESP32_Presenca_001",
  "general": {
    "totalEntries": 150,
    "totalExits": 147,
    "maxOccupancy": 8,
    "avgOccupancy": 2.3,
    "totalRecords": 300
  },
  "daily": [...],
  "hourly": [...]
}
```

#### GET /presenca/history
Obtém histórico de presença para gráficos.

**Parâmetros de Query:**
- `device_id` (string, opcional): ID do dispositivo
- `hours` (number, opcional): Período em horas (padrão: 24)
- `interval` (number, opcional): Intervalo em minutos (padrão: 15)

#### POST /presenca
Cria uma nova entrada de presença (para testes).

**Body:**
```json
{
  "contador": 3,
  "evento": "ENTRADA",
  "device_id": "ESP32_Presenca_001",
  "sensor": 1
}
```

#### DELETE /presenca/:id
Remove uma entrada de presença.

### Alertas

#### GET /alerta
Lista todos os alertas com paginação.

**Parâmetros de Query:**
- `page` (number, opcional): Página atual
- `limit` (number, opcional): Itens por página
- `device_id` (string, opcional): Filtrar por dispositivo
- `tipo` (string, opcional): Filtrar por tipo
- `status` (string, opcional): Filtrar por status (ATIVO, RESOLVIDO, IGNORADO)
- `start_date` (string, opcional): Data inicial
- `end_date` (string, opcional): Data final

#### GET /alerta/active
Lista alertas ativos.

#### GET /alerta/stats
Obtém estatísticas de alertas.

#### GET /alerta/:id
Obtém um alerta específico.

#### PATCH /alerta/:id/resolve
Marca um alerta como resolvido.

#### PATCH /alerta/:id/ignore
Marca um alerta como ignorado.

#### DELETE /alerta/:id
Remove um alerta.

#### POST /alerta/test
Cria um alerta de teste.

**Body:**
```json
{
  "tipo": "OCUPACAO_MAXIMA",
  "device_id": "ESP32_Presenca_001",
  "contador": 6
}
```

#### POST /alerta/bulk-resolve
Marca múltiplos alertas como resolvidos.

**Body:**
```json
{
  "ids": ["id1", "id2"],
  "device_id": "ESP32_Presenca_001",
  "tipo": "OCUPACAO_MAXIMA"
}
```

### Dashboard

#### GET /dashboard/overview
Obtém visão geral do dashboard.

**Parâmetros de Query:**
- `device_id` (string, opcional): ID do dispositivo

#### GET /dashboard/charts
Obtém dados para gráficos.

**Parâmetros de Query:**
- `device_id` (string, opcional): ID do dispositivo
- `days` (number, opcional): Período em dias

#### GET /dashboard/realtime
Obtém dados em tempo real.

**Parâmetros de Query:**
- `device_id` (string, opcional): ID do dispositivo
- `minutes` (number, opcional): Período em minutos

#### GET /dashboard/analytics
Obtém análises avançadas.

**Parâmetros de Query:**
- `device_id` (string, opcional): ID do dispositivo
- `days` (number, opcional): Período em dias

### Sistema

#### GET /health
Verifica o status do sistema.

**Resposta:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "mqtt": {
    "connected": true,
    "reconnectAttempts": 0,
    "maxReconnectAttempts": 5
  },
  "database": "connected"
}
```

#### GET /config
Obtém configurações do sistema.

**Resposta:**
```json
{
  "maxOccupancy": 5,
  "idleTimeout": 1800000,
  "anomalyTimeout": 7200000,
  "adminEmail": "admin@exemplo.com",
  "managerEmail": "gerencia@exemplo.com"
}
```

## 📡 WebSocket Events

### Conexão
```javascript
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Conectado ao servidor');
});
```

### Eventos Recebidos

#### presence_update
Atualização de presença em tempo real.
```javascript
socket.on('presence_update', (data) => {
  console.log('Nova presença:', data);
  // data: { device_id, contador, evento, timestamp }
});
```

#### status_update
Atualização de status do dispositivo.
```javascript
socket.on('status_update', (data) => {
  console.log('Status atualizado:', data);
  // data: { device_id, status, contador, wifi_rssi, uptime, timestamp }
});
```

#### new_alert
Novo alerta gerado.
```javascript
socket.on('new_alert', (data) => {
  console.log('Novo alerta:', data);
  // data: { tipo, titulo, descricao, contador, device_id, timestamp }
});
```

#### alert_resolved
Alerta resolvido.
```javascript
socket.on('alert_resolved', (data) => {
  console.log('Alerta resolvido:', data);
  // data: { alertId, timestamp }
});
```

### Eventos Enviados

#### join_device
Entrar na sala de um dispositivo específico.
```javascript
socket.emit('join_device', 'ESP32_Presenca_001');
```

#### leave_device
Sair da sala de um dispositivo.
```javascript
socket.emit('leave_device', 'ESP32_Presenca_001');
```

#### send_command
Enviar comando para dispositivo.
```javascript
socket.emit('send_command', {
  deviceId: 'ESP32_Presenca_001',
  command: 'ALERTA',
  payload: { tipo: 'OCUPACAO_MAXIMA', mensagem: 'Sala cheia!' }
});
```

#### resolve_alert
Resolver alerta.
```javascript
socket.emit('resolve_alert', 'alert_id_here');
```

## 🚨 Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Requisição inválida
- `404` - Recurso não encontrado
- `500` - Erro interno do servidor

## 📝 Exemplos de Uso

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Buscar contador atual
const response = await axios.get('http://localhost:3001/api/presenca/current');
console.log('Pessoas na sala:', response.data.contador);

// Criar alerta de teste
await axios.post('http://localhost:3001/api/alerta/test', {
  tipo: 'OCUPACAO_MAXIMA',
  device_id: 'ESP32_Presenca_001',
  contador: 6
});
```

### Python
```python
import requests

# Buscar estatísticas
response = requests.get('http://localhost:3001/api/presenca/stats?days=7')
stats = response.json()
print(f"Total de entradas: {stats['general']['totalEntries']}")

# Resolver alerta
requests.patch('http://localhost:3001/api/alerta/alert_id/resolve')
```

### cURL
```bash
# Buscar alertas ativos
curl "http://localhost:3001/api/alerta/active"

# Criar presença de teste
curl -X POST "http://localhost:3001/api/presenca" \
  -H "Content-Type: application/json" \
  -d '{"contador": 2, "evento": "ENTRADA", "device_id": "ESP32_Presenca_001"}'
```

## 🔧 Rate Limiting

A API implementa rate limiting para prevenir abuso:
- **Limite:** 100 requisições por 15 minutos por IP
- **Headers de resposta:**
  - `X-RateLimit-Limit`: Limite de requisições
  - `X-RateLimit-Remaining`: Requisições restantes
  - `X-RateLimit-Reset`: Timestamp de reset

## 📊 Logs e Monitoramento

A API registra logs detalhados incluindo:
- Requisições HTTP
- Erros e exceções
- Conexões MQTT
- Operações de banco de dados

Para visualizar logs em tempo real:
```bash
# Backend logs
tail -f backend/logs/app.log

# MongoDB logs
tail -f /var/log/mongodb/mongod.log
```
