#define SENSOR1  18
#define SENSOR2  19
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "varenya";
const char* password = "acdt1968";
const char* serverUrl = "http://192.168.47.46:3000/api/pressure";

long currentMillis = 0;
long previousMillis = 0;
int interval = 1000;
float calibrationFactor = 4.5;
volatile byte pulseCount1 = 0;
volatile byte pulseCount2 = 0;
byte pulse1Sec1 = 0;
byte pulse1Sec2 = 0;
float flowRate1 = 0.0;
float flowRate2 = 0.0;

void IRAM_ATTR pulseCounter1() {
  pulseCount1++;
}

void IRAM_ATTR pulseCounter2() {
  pulseCount2++;
}

void hello(float flowRate1, float flowRate2) {
  
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Create JSON payload
    String payload = String("{\"end1Pressure\":") + flowRate1 + 
                     String(",\"end2Pressure\":") + flowRate2 + "}";

    // Send POST request
    int httpResponseCode = http.POST(payload);
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
    } else {
      Serial.println("Error on sending POST: " + String(httpResponseCode));
    }
    http.end();
  } else {
    Serial.println("Wi-Fi disconnected");
  }

}

void setup() {
  Serial.begin(115200);
  
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\nConnected to Wi-Fi");

  pinMode(SENSOR1, INPUT_PULLUP);
  pinMode(SENSOR2, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(SENSOR1), pulseCounter1, FALLING);
  attachInterrupt(digitalPinToInterrupt(SENSOR2), pulseCounter2, FALLING);
}

void loop() {
  currentMillis = millis();
  if (currentMillis - previousMillis > interval) {
    pulse1Sec1 = pulseCount1;
    pulse1Sec2 = pulseCount2;
    pulseCount1 = 0;
    pulseCount2 = 0;
    flowRate1 = ((1000.0 / (millis() - previousMillis)) * pulse1Sec1) / calibrationFactor;
    flowRate2 = ((1000.0 / (millis() - previousMillis)) * pulse1Sec2) / calibrationFactor;
    previousMillis = millis();
    hello(flowRate1, flowRate2);
  }
}
