import axios, { AxiosInstance } from "axios";
import { config } from "dotenv";
import * as https from "https";
import { Client as MqttClient } from "mqtt";
import { AppConfig } from "./Config";

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
  private readonly api: AxiosInstance;
  public hasError = false;
  private lastReadingTime = 0;
  private toClear: NodeJS.Timer | null = null;

  constructor(config: AppConfig, private mqtt: MqttClient) {
    console.log(`Connecting to ${config.envoy.host}`);
    this.api = axios.create({
      baseURL: config.envoy.host,
      headers: {
        Authorization: `Bearer ${config.envoy.token}`,
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    const parsedTokenBody = JSON.parse(
      Buffer.from(config.envoy.token.split(".")[1], "base64").toString()
    );
    const expire = new Date(parsedTokenBody.exp * 1000);
    console.log("Token will expire at ", expire);
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
      const { data } = await this.api.get<EnvoyResponse>(
        "/production.json?details=1"
      );
      let { activeCount, readingTime, wNow, whLifetime } = data.production[0];
      const lastReadDate = new Date(readingTime * 1000);
      if (this.lastReadingTime === readingTime) {
        console.log("No update from envoy");
        return;
      } else {
        console.log(
          `Updating with last reading now=${wNow} lifetime=${whLifetime} from ${lastReadDate}`
        );
      }
      const prefix = "envoy/garage/";
      await this.publish(prefix + "active_count", activeCount.toString());
      await this.publish(prefix + "watt_now", wNow.toString());
      await this.publish(prefix + "watt_lifetime", whLifetime.toString());
      await this.publish(prefix + "last_read", lastReadDate.toISOString());
      await this.publish(prefix + "last_read_epoch", readingTime.toString());

      await this.publish(prefix + "last_read_epoch", readingTime.toString());
      await this.publish(prefix + "last_read_epoch", readingTime.toString());
    } catch (e) {
      console.error(e);
    }
  }
}
