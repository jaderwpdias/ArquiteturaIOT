// Sketch mínimo para Wokwi (ESP32 + 2x PIR + LED RGB + Buzzer)
// Pinos compatíveis com o seu projeto

const int PIR_SENSOR_1_PIN = 4;   // Entrada
const int PIR_SENSOR_2_PIN = 5;   // Saída
const int LED_RED_PIN      = 12;
const int LED_GREEN_PIN    = 13;
const int LED_BLUE_PIN     = 14;
const int BUZZER_PIN       = 15;

void setup() {
  Serial.begin(115200);

  pinMode(PIR_SENSOR_1_PIN, INPUT);
  pinMode(PIR_SENSOR_2_PIN, INPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_BLUE_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_BLUE_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println("Wokwi: Sistema de Presença - Sketch mínimo");
}

void loop() {
  bool s1 = digitalRead(PIR_SENSOR_1_PIN);
  bool s2 = digitalRead(PIR_SENSOR_2_PIN);

  if (s1) {
    Serial.println("PIR1: Movimento (ENTRADA)");
    setRgb(0, 255, 0); // Verde
    beep(1);
  } else if (s2) {
    Serial.println("PIR2: Movimento (SAIDA)");
    setRgb(0, 0, 255); // Azul
    beep(1);
  } else {
    setRgb(0, 0, 0);
  }

  delay(100);
}

void setRgb(int r, int g, int b) {
  digitalWrite(LED_RED_PIN,   r > 0 ? HIGH : LOW);
  digitalWrite(LED_GREEN_PIN, g > 0 ? HIGH : LOW);
  digitalWrite(LED_BLUE_PIN,  b > 0 ? HIGH : LOW);
}

void beep(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);
    delay(150);
  }
}


