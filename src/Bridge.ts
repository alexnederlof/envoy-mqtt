import { Client as MqttClient } from "mqtt";
import { AppConfig } from "./Config";
import { EnphaseApi } from "./EnphaseApi";

export interface EnvoyResponse {
  production: Production[];
}

export interface Production {
  type: string;
  activeCount: number;
  readingTime: number;
  wNow: number;
  whLifetime: number;
}

export class Bridge {
  public readonly api: EnphaseApi;
  public hasError = false;
  private lastReadingTime = 0;
  private lastReadTimePerInverter: { [key: string]: number } = {};
  public lastMqttDispatch: Date | null = null;
  private toClear: NodeJS.Timer | null = null;
  private readonly mqttPrefix: string;

  constructor(config: AppConfig, private mqtt: MqttClient) {
    this.api = new EnphaseApi(config.envoy);
    let prefix = process.env["MQTT_TOPIC_PREFIX"] || "envoy/";
    if (!prefix.endsWith("/")) {
      prefix += "/";
    }
    this.mqttPrefix = prefix;
  }

  public async start() {
    await this.getLatest();
    this.toClear = setInterval(() => this.getLatest(), 60_000);
  }
  public async stop() {
    if (this.toClear != null) {
      clearInterval(this.toClear);
    }
    console.log("Shutting down mqtt");
    await new Promise((res) => this.mqtt.end(false, {}, res));
    console.log("Shutdown complete");
  }

  private async publish(key: string, value: string) {
    return new Promise<number | undefined>((res, rej) =>
      this.mqtt.publish(key, value, (err, ok) => {
        if (err) {
          rej(err);
        } else {
          res(ok?.messageId);
        }
      })
    );
  }

  async getLatest() {
    try {
      await this.sendProdData();
      await this.sendPerInverterData();
    } catch (e) {
      console.error(e);
    }
  }

  async sendProdData() {
    const data = await this.api.getProductionData();
    let { activeCount, readingTime, wNow, whLifetime } = data.production[0];
    const lastReadDate = new Date(readingTime * 1000);
    if (this.lastReadingTime === readingTime) {
      console.log("No update from envoy");
    } else {
      this.lastReadingTime = readingTime;
      console.log(
        `Updating with last reading now=${wNow} lifetime=${whLifetime} from ${lastReadDate}`
      );
    }
    await this.publish(
      this.mqttPrefix + "active_count",
      activeCount.toString()
    );
    await this.publish(this.mqttPrefix + "watt_now", wNow.toString());
    await this.publish(
      this.mqttPrefix + "watt_lifetime",
      whLifetime.toString()
    );
    await this.publish(
      this.mqttPrefix + "last_read",
      lastReadDate.toISOString()
    );
    await this.publish(
      this.mqttPrefix + "last_read_epoch",
      readingTime.toString()
    );
    this.lastMqttDispatch = new Date();
  }

  async sendPerInverterData() {
    const perInverter = await this.api.getInverters();
    for (const inverter of perInverter) {
      try {
        const {
          serialNumber,
          lastReportDate,
          lastReportWatts,
          maxReportWatts,
        } = inverter;
        if (
          (this.lastReadTimePerInverter[serialNumber] || 0) < lastReportDate
        ) {
          this.lastReadTimePerInverter[serialNumber] = lastReportDate;
          const prefix = `${this.mqttPrefix}/inverter/${serialNumber}/`;
          const lastReadDate = new Date(lastReportDate * 1000);
          await this.publish(prefix + "last_watts", lastReportWatts.toString());
          await this.publish(prefix + "max_watts", maxReportWatts.toString());
          await this.publish(prefix + "last_read", lastReadDate.toISOString());
          await this.publish(
            prefix + "last_read_epoch",
            lastReportDate.toString()
          );
        }
      } catch (error) {
        console.error("Could not update one inverter", error);
      }
    }
  }
}
