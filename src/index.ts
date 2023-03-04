import { config as loadEnv } from "dotenv";
import { Client as MqttClient, connect as newMqttClient } from "mqtt";
import { Bridge } from "./Bridge";
import { AppConfig, parse } from "./Config";
import { HttpServer } from "./server";

async function main() {
  await loadEnv();
  const config = parse();
  const mqtt = await connectToMqtt(config);
  const bridge = new Bridge(config, mqtt);
  const server = new HttpServer(bridge);

  function stop() {
    bridge.stop();
    server.stop();
  }

  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  server.start();
  bridge.start().catch((e) => {
    console.error("Bridge error", e);
    stop();
  });
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
