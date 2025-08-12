#include "config.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Objetos globais
WiFiClient espClient;
PubSubClient client(espClient);
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

// Variáveis de estado
int contadorPessoas = 0;
unsigned long ultimaDetecao = 0;
unsigned long ultimoHeartbeat = 0;
bool sensor1Ativo = false;
bool sensor2Ativo = false;
bool wifiConectado = false;
bool mqttConectado = false;

// Estrutura para dados de presença
struct DadosPresenca {
  int contador;
  unsigned long timestamp;
  String evento;
  int sensor;
};

void setup() {
  Serial.begin(115200);
  Serial.println("Iniciando Sistema de Contador de Presença...");
  
  // Configurar pinos
  configurarPinos();
  
  // Inicializar display
  inicializarDisplay();
  
  // Conectar WiFi
  conectarWiFi();
  
  // Configurar MQTT
  configurarMQTT();
  
  // Exibir informações iniciais
  exibirStatusInicial();
}

void loop() {
  // Manter conexões ativas
  manterConexoes();
  
  // Ler sensores
  lerSensores();
  
  // Enviar heartbeat
  enviarHeartbeat();
  
  // Atualizar display
  atualizarDisplay();
  
  delay(100);
}

void configurarPinos() {
  pinMode(PIR_SENSOR_1_PIN, INPUT);
  pinMode(PIR_SENSOR_2_PIN, INPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_BLUE_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Inicializar LEDs
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_BLUE_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
}

void inicializarDisplay() {
  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("Falha ao inicializar display OLED");
    return;
  }
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0,0);
  display.println("Sistema de Presenca");
  display.display();
  delay(2000);
}

void conectarWiFi() {
  Serial.print("Conectando ao WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - inicio) < WIFI_TIMEOUT) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConectado = true;
    Serial.println("\nWiFi conectado!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    acenderLED(LED_GREEN_PIN);
  } else {
    Serial.println("\nFalha na conexão WiFi!");
    acenderLED(LED_RED_PIN);
  }
}

void configurarMQTT() {
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(callbackMQTT);
  conectarMQTT();
}

void conectarMQTT() {
  if (!client.connected()) {
    Serial.print("Conectando ao MQTT...");
    if (client.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
      mqttConectado = true;
      Serial.println("MQTT conectado!");
      
      // Subscrever aos tópicos
      client.subscribe(MQTT_TOPIC_ALERTAS);
      
      // Enviar status inicial
      enviarStatus();
    } else {
      Serial.print("Falha MQTT, rc=");
      Serial.println(client.state());
      mqttConectado = false;
    }
  }
}

void callbackMQTT(char* topic, byte* payload, unsigned int length) {
  String mensagem = "";
  for (int i = 0; i < length; i++) {
    mensagem += (char)payload[i];
  }
  
  Serial.print("Mensagem recebida [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(mensagem);
  
  // Processar alertas
  if (String(topic) == MQTT_TOPIC_ALERTAS) {
    processarAlerta(mensagem);
  }
}

void processarAlerta(String alerta) {
  if (alerta.indexOf("OCUPACAO_MAXIMA") >= 0) {
    acenderLED(LED_RED_PIN);
    tocarBuzzer(3);
  } else if (alerta.indexOf("SALA_OCIOSA") >= 0) {
    acenderLED(LED_BLUE_PIN);
    tocarBuzzer(1);
  } else if (alerta.indexOf("PERMANENCIA_ANOMAL") >= 0) {
    acenderLED(LED_RED_PIN);
    tocarBuzzer(2);
  }
}

void lerSensores() {
  bool sensor1 = digitalRead(PIR_SENSOR_1_PIN);
  bool sensor2 = digitalRead(PIR_SENSOR_2_PIN);
  
  unsigned long agora = millis();
  
  // Detecção de entrada (sensor 1)
  if (sensor1 && !sensor1Ativo && (agora - ultimaDetecao) > DEBOUNCE_TIME) {
    sensor1Ativo = true;
    contadorPessoas++;
    ultimaDetecao = agora;
    
    Serial.println("Pessoa entrou! Contador: " + String(contadorPessoas));
    enviarDadosPresenca("ENTRADA", 1);
    
  } else if (!sensor1) {
    sensor1Ativo = false;
  }
  
  // Detecção de saída (sensor 2)
  if (sensor2 && !sensor2Ativo && (agora - ultimaDetecao) > DEBOUNCE_TIME) {
    sensor2Ativo = true;
    if (contadorPessoas > 0) {
      contadorPessoas--;
    }
    ultimaDetecao = agora;
    
    Serial.println("Pessoa saiu! Contador: " + String(contadorPessoas));
    enviarDadosPresenca("SAIDA", 2);
    
  } else if (!sensor2) {
    sensor2Ativo = false;
  }
}

void enviarDadosPresenca(String evento, int sensor) {
  if (!mqttConectado) return;
  
  StaticJsonDocument<200> doc;
  doc["contador"] = contadorPessoas;
  doc["timestamp"] = millis();
  doc["evento"] = evento;
  doc["sensor"] = sensor;
  doc["device_id"] = MQTT_CLIENT_ID;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  if (client.publish(MQTT_TOPIC_PRESENCA, jsonString.c_str())) {
    Serial.println("Dados enviados: " + jsonString);
  } else {
    Serial.println("Falha ao enviar dados");
  }
}

void enviarStatus() {
  if (!mqttConectado) return;
  
  StaticJsonDocument<200> doc;
  doc["status"] = "online";
  doc["contador"] = contadorPessoas;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["uptime"] = millis();
  doc["device_id"] = MQTT_CLIENT_ID;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  client.publish(MQTT_TOPIC_STATUS, jsonString.c_str());
}

void enviarHeartbeat() {
  unsigned long agora = millis();
  if (agora - ultimoHeartbeat > HEARTBEAT_INTERVAL) {
    enviarStatus();
    ultimoHeartbeat = agora;
  }
}

void manterConexoes() {
  // Manter WiFi
  if (WiFi.status() != WL_CONNECTED) {
    wifiConectado = false;
    acenderLED(LED_RED_PIN);
    conectarWiFi();
  }
  
  // Manter MQTT
  if (!client.connected()) {
    mqttConectado = false;
    conectarMQTT();
  }
  
  client.loop();
}

void atualizarDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  // Título
  display.setCursor(0, 0);
  display.println("CONTADOR DE PRESENCA");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
  
  // Contador
  display.setTextSize(3);
  display.setCursor(20, 20);
  display.println(contadorPessoas);
  
  // Status
  display.setTextSize(1);
  display.setCursor(0, 50);
  display.print("WiFi: ");
  display.println(wifiConectado ? "OK" : "ERRO");
  display.print("MQTT: ");
  display.println(mqttConectado ? "OK" : "ERRO");
  
  display.display();
}

void exibirStatusInicial() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Sistema Iniciado!");
  display.println("");
  display.println("WiFi: Conectando...");
  display.println("MQTT: Conectando...");
  display.println("");
  display.println("Aguardando sensores...");
  display.display();
}

void acenderLED(int pino) {
  // Apagar todos os LEDs
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_BLUE_PIN, LOW);
  
  // Acender o LED especificado
  digitalWrite(pino, HIGH);
  
  // Apagar após 2 segundos
  delay(2000);
  digitalWrite(pino, LOW);
}

void tocarBuzzer(int vezes) {
  for (int i = 0; i < vezes; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    delay(200);
  }
}
