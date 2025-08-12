#ifndef CONFIG_H
#define CONFIG_H

// Configurações WiFi
#define WIFI_SSID "SUA_REDE_WIFI"
#define WIFI_PASSWORD "SUA_SENHA_WIFI"

// Configurações MQTT
#define MQTT_SERVER "seu-servidor-mqtt.com"
#define MQTT_PORT 1883
#define MQTT_USERNAME "esp32_presenca"
#define MQTT_PASSWORD "senha_mqtt"
#define MQTT_CLIENT_ID "ESP32_Presenca_001"

// Tópicos MQTT
#define MQTT_TOPIC_PRESENCA "sala/presenca"
#define MQTT_TOPIC_ALERTAS "sala/alertas"
#define MQTT_TOPIC_STATUS "sala/status"

// Pinagem dos Sensores
#define PIR_SENSOR_1_PIN 4    // Sensor PIR 1 (entrada)
#define PIR_SENSOR_2_PIN 5    // Sensor PIR 2 (saída)
#define LED_RED_PIN 12        // LED Vermelho
#define LED_GREEN_PIN 13      // LED Verde
#define LED_BLUE_PIN 14       // LED Azul
#define BUZZER_PIN 15         // Buzzer

// Configurações do Display OLED
#define OLED_SDA_PIN 21
#define OLED_SCL_PIN 22
#define OLED_WIDTH 128
#define OLED_HEIGHT 64

// Configurações de Tempo
#define DEBOUNCE_TIME 2000    // Tempo de debounce em ms
#define HEARTBEAT_INTERVAL 30000  // Intervalo de heartbeat em ms
#define SENSOR_TIMEOUT 5000   // Timeout do sensor em ms

// Configurações de Ocupação
#define MAX_OCCUPANCY 5       // Ocupação máxima da sala
#define IDLE_TIMEOUT 1800000  // 30 minutos em ms
#define ANOMALY_TIMEOUT 7200000 // 2 horas em ms

// Configurações de Rede
#define WIFI_TIMEOUT 10000    // Timeout de conexão WiFi
#define MQTT_TIMEOUT 5000     // Timeout de conexão MQTT

#endif
