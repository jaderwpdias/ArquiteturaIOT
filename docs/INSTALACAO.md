# Guia de Instalação - Sistema de Contador de Presença

## 📋 Pré-requisitos

### Hardware Necessário
- **ESP32** (ou ESP8266)
- **2x Sensores PIR** (Presença Infravermelho Passivo)
- **LED RGB** (opcional, para feedback visual)
- **Buzzer** (opcional, para alertas sonoros)
- **Display OLED 128x64** (opcional, para informações locais)
- **Cabo USB** para programação
- **Protoboard** e jumpers

### Software Necessário
- **Arduino IDE** (versão 1.8.x ou superior)
- **Node.js** (versão 16.x ou superior)
- **MongoDB** (versão 4.4 ou superior)
- **MQTT Broker** (Mosquitto ou similar)

## 🚀 Instalação Passo a Passo

### 1. Configuração do Hardware

#### Conexões do ESP32:
```
Sensor PIR 1 (Entrada):
- VCC → 3.3V
- GND → GND
- OUT → GPIO 4

Sensor PIR 2 (Saída):
- VCC → 3.3V
- GND → GND
- OUT → GPIO 5

LED RGB:
- Vermelho → GPIO 12
- Verde → GPIO 13
- Azul → GPIO 14
- GND → GND

Buzzer:
- VCC → GPIO 15
- GND → GND

Display OLED:
- SDA → GPIO 21
- SCL → GPIO 22
- VCC → 3.3V
- GND → GND
```

### 2. Configuração do Arduino IDE

1. **Instalar ESP32 Board Manager:**
   - Abra Arduino IDE
   - Vá em `Arquivo > Preferências`
   - Adicione em "URLs Adicionais para Gerenciador de Placas":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Vá em `Ferramentas > Placa > Gerenciador de Placas`
   - Procure por "ESP32" e instale

2. **Instalar Bibliotecas Necessárias:**
   - Vá em `Sketch > Incluir Biblioteca > Gerenciar Bibliotecas`
   - Instale as seguintes bibliotecas:
     - `PubSubClient` (por Nick O'Leary)
     - `ArduinoJson` (por Benoit Blanchon)
     - `Adafruit GFX Library`
     - `Adafruit SSD1306`

3. **Configurar ESP32:**
   - Selecione a placa: `Ferramentas > Placa > ESP32 Arduino > ESP32 Dev Module`
   - Configure a porta COM correta

### 3. Configuração do Código ESP32

1. **Editar configurações:**
   - Abra o arquivo `esp32/config.h`
   - Configure suas credenciais WiFi:
     ```cpp
     #define WIFI_SSID "SUA_REDE_WIFI"
     #define WIFI_PASSWORD "SUA_SENHA_WIFI"
     ```
   - Configure o servidor MQTT:
     ```cpp
     #define MQTT_SERVER "seu-servidor-mqtt.com"
     #define MQTT_PORT 1883
     ```

2. **Fazer upload do código:**
   - Abra `esp32/presenca_esp32.ino` no Arduino IDE
   - Clique em "Upload"

### 4. Instalação do Backend

1. **Instalar MongoDB:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install mongodb
   sudo systemctl start mongodb
   sudo systemctl enable mongodb

   # macOS (com Homebrew)
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb/brew/mongodb-community
   ```

2. **Instalar MQTT Broker (Mosquitto):**
   ```bash
   # Ubuntu/Debian
   sudo apt install mosquitto mosquitto-clients
   sudo systemctl start mosquitto
   sudo systemctl enable mosquitto

   # macOS
   brew install mosquitto
   brew services start mosquitto
   ```

3. **Configurar o Backend:**
   ```bash
   cd backend
   npm install
   ```

4. **Configurar variáveis de ambiente:**
   ```bash
   cp env.example .env
   ```
   
   Edite o arquivo `.env` com suas configurações:
   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/presenca
   MQTT_BROKER=mqtt://localhost:1883
   EMAIL_HOST=smtp.gmail.com
   EMAIL_USER=seu-email@gmail.com
   EMAIL_PASS=sua-senha-app
   ```

5. **Iniciar o backend:**
   ```bash
   npm start
   ```

### 5. Instalação do Dashboard

1. **Instalar dependências:**
   ```bash
   cd dashboard
   npm install
   ```

2. **Configurar Tailwind CSS:**
   ```bash
   npx tailwindcss init
   ```

3. **Iniciar o dashboard:**
   ```bash
   npm start
   ```

## 🔧 Configuração de Email (Gmail)

Para usar Gmail como servidor de email:

1. **Ativar autenticação de 2 fatores** na sua conta Google
2. **Gerar senha de app:**
   - Vá em `Configurações da Conta Google > Segurança`
   - Em "Como você faz login no Google", clique em "Senhas de app"
   - Gere uma nova senha para "Email"
3. **Usar a senha gerada** no campo `EMAIL_PASS` do arquivo `.env`

## 🧪 Testando o Sistema

### 1. Verificar Conexões
- Acesse `http://localhost:3000` (Dashboard)
- Verifique se o status mostra "Conectado"
- Confirme se o ESP32 aparece na lista de dispositivos

### 2. Testar Sensores
- Passe a mão na frente do sensor PIR 1 (entrada)
- Verifique se o contador aumenta no dashboard
- Passe a mão na frente do sensor PIR 2 (saída)
- Verifique se o contador diminui

### 3. Testar Alertas
- Use a API para criar alertas de teste:
  ```bash
  curl -X POST http://localhost:3001/api/alerta/test \
    -H "Content-Type: application/json" \
    -d '{"tipo":"OCUPACAO_MAXIMA","device_id":"ESP32_Presenca_001","contador":6}'
  ```

## 🚨 Solução de Problemas

### ESP32 não conecta ao WiFi
- Verifique as credenciais WiFi no `config.h`
- Confirme se a rede está funcionando
- Verifique a distância do ESP32 ao roteador

### MQTT não conecta
- Verifique se o Mosquitto está rodando: `sudo systemctl status mosquitto`
- Confirme as configurações MQTT no `config.h`
- Teste a conexão: `mosquitto_pub -h localhost -t test -m "hello"`

### Dashboard não carrega dados
- Verifique se o backend está rodando na porta 3001
- Confirme se o MongoDB está ativo
- Verifique os logs do backend para erros

### Emails não são enviados
- Verifique as configurações SMTP no `.env`
- Confirme se a senha de app do Gmail está correta
- Teste a conexão de email no dashboard

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs do sistema
2. Consulte a documentação da API
3. Abra uma issue no repositório do projeto

## 🔄 Atualizações

Para atualizar o sistema:

1. **Backend:**
   ```bash
   cd backend
   git pull
   npm install
   npm start
   ```

2. **Dashboard:**
   ```bash
   cd dashboard
   git pull
   npm install
   npm start
   ```

3. **ESP32:** Faça upload da nova versão do código via Arduino IDE
