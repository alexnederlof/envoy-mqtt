import { config as loadEnv } from "dotenv";
import { Client as MqttClient, connect as newMqttClient } from "mqtt";
import { Bridge } from "./Bridge";
import { AppConfig, parse } from "./Config";

async function main() {
  await loadEnv();
  const config = parse();
  const mqtt = await connectToMqtt(config);
  const bridge = new Bridge(config, mqtt);

  process.on("SIGTERM", () => bridge.stop);
  process.on("SIGINT", () => bridge.stop);

  bridge.start();
}

async function connectToMqtt(config: AppConfig) {
  return new Promise<MqttClient>((res, reject) => {
    console.log("Connecting to MQTT " + config.mqtt.address);
    const client = newMqttClient({
      host: config.mqtt.address,
      username: config.mqtt.user,
      password: config.mqtt.password,
      clientId: "envoy_mqtt",
    });
    let connectedBefore = false;
    client.on("connect", () => {
      if (!connectedBefore) {
        connectedBefore = true;
        console.log("Connected to MQTT!");
        res(client);
      }
    });
    client.on("error", (e) => reject(e));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
