# Contador de Presença com Alertas Inteligentes

## 📋 Descrição do Projeto

Sistema IoT inteligente para contagem de pessoas em salas/escritórios com reconhecimento de padrões e alertas automáticos. O sistema utiliza sensores PIR para detectar presença e uma arquitetura cloud para processar dados e gerar alertas baseados em padrões específicos.

## 🏗️ Arquitetura do Sistema

### Componentes IoT (Hardware)
- **Microcontrolador**: ESP32
- **Sensores**: 2x Sensores PIR (Presença Infravermelho Passivo)
- **Feedback Local**: LED RGB + Buzzer para alertas visuais/sonoros
- **Display**: OLED 128x64 para informações locais

### Componentes Cloud
- **Backend**: Node.js com Express
- **Banco de Dados**: MongoDB (histórico e configurações)
- **Processamento**: Cloud Functions para análise de padrões
- **Notificações**: Email via Nodemailer
- **Dashboard**: Interface web em tempo real

## 🎯 Funcionalidades

### Reconhecimento de Padrões
1. **Ocupação Máxima**: Alerta quando sala ultrapassa limite de pessoas
2. **Sala Ociosa**: Notificação após período sem presença
3. **Permanência Anormal**: Alerta para permanência prolongada de uma pessoa
4. **Padrões de Horário**: Análise de ocupação por período do dia

### Alertas Inteligentes
- **Email**: Notificações automáticas para administradores
- **Dashboard**: Alertas visuais em tempo real
- **Feedback Local**: LED e buzzer no dispositivo IoT
- **Logs**: Histórico completo de eventos e alertas

## 📁 Estrutura do Projeto

```
projetoArquitetura/
├── esp32/                    # Código do microcontrolador
├── backend/                  # API e processamento cloud
├── dashboard/                # Interface web
├── docs/                     # Documentação
└── README.md
```

## 🚀 Como Executar

### 1. Configuração do ESP32
```bash
cd esp32
# Instalar dependências do Arduino IDE
# Configurar credenciais WiFi e MQTT
# Fazer upload do código
```

### 2. Configuração do Backend
```bash
cd backend
npm install
npm start
```

### 3. Configuração do Dashboard
```bash
cd dashboard
npm install
npm start
```

## 🔧 Configuração

### Variáveis de Ambiente
Criar arquivo `.env` no backend:
```
MONGODB_URI=mongodb://localhost:27017/presenca
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha
MQTT_BROKER=mqtt://localhost:1883
```

### Configurações do ESP32
Editar `esp32/config.h`:
```cpp
#define WIFI_SSID "sua-rede-wifi"
#define WIFI_PASSWORD "sua-senha"
#define MQTT_SERVER "seu-servidor-mqtt"
#define MQTT_PORT 1883
```

## 📊 Dashboard

Acesse `http://localhost:3000` para visualizar:
- Contador de pessoas em tempo real
- Histórico de ocupação
- Alertas ativos
- Configurações do sistema

## 🔔 Tipos de Alertas

1. **Ocupação Máxima** (limite: 5 pessoas)
2. **Sala Ociosa** (30 min sem presença)
3. **Permanência Anomal** (2h+ de uma pessoa)
4. **Padrão de Horário** (ocupação fora do normal)

## 🛠️ Tecnologias Utilizadas

- **IoT**: ESP32, Arduino Framework
- **Backend**: Node.js, Express, MongoDB
- **Frontend**: React, Socket.io
- **Comunicação**: MQTT, WebSocket
- **Notificações**: Nodemailer

## 📝 Licença

Este projeto é desenvolvido para fins educacionais.
