import axios, { AxiosError, AxiosInstance } from "axios";
import * as https from "https";
import { AppConfig } from "./Config";

interface JwtToken {
  aud: string; // Serial number of the gateway
  iss: string; // Entrez
  enphaseUser: string; // Owner or installer
  exp: number;
  iat: number;
  jti: string;
  username: string; // your email
}

export interface ProdResponse {
  production: Production[];
}

export interface Production {
  type: string;
  activeCount: number;
  readingTime: number;
  wNow: number;
  whLifetime: number;
}

export interface Inverter {
  serialNumber: string;
  lastReportDate: number;
  devType: number;
  lastReportWatts: number;
  maxReportWatts: number;
}

export class EnphaseApi {
  private jwtToken: string | null = null;
  private apiInstance: AxiosInstance;
  private loginPromise: Promise<void> | null = null;

  constructor(private config: AppConfig["envoy"]) {
    console.log("Setting base URL");
    this.apiInstance = axios.create({
      baseURL: config.host,
      withCredentials: true,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });
  }

  private async login() {
    if (this.loginPromise) {
      // Another request is already on its way. Just wait for that to complete.
      return this.loginPromise;
    }
    const doLogin = async () => {
      if (this.tokenExpired()) {
        await this.obtainJwtToken();
      }
      /* 
          According to 
          https://enphase.com/download/accessing-iq-gateway-local-apis-or-local-ui-token-based-authentication 
          You don't need a session token and the auth header should just work. However, seems like that's not 
          working so we obtain a session token anyway.
      
          The cookie has no expiry set. For the browser that means it's valid for one browser session. However,
          we can keep it as long as we like, and probably it will expire at some point, so we just use it
          until we get a 401 and then get a fresh one.
          */
      console.log("Getting a fresh session cookie");
      const { headers } = await this.apiInstance.get("/auth/check_jwt");
      this.apiInstance.defaults.headers["cookie"] = headers["set-cookie"]!;
      console.log("Session cookie set");
    };
    this.loginPromise = doLogin(); // Login and lock this as the main promise.
    try {
      await this.loginPromise; // Wait for it to complete
    } finally {
      // Always release the lock
      this.loginPromise = null;
    }
  }

  private tokenExpired() {
    if (!this.jwtToken) {
      console.log("No JWT token set");
      return true;
    }
    try {
      const parsed = this.parseToken(this.jwtToken);
      const oneMinuteMargin = 60;
      const issued = new Date(parsed.iat * 1000);
      const expires = new Date((parsed.exp - oneMinuteMargin) * 1000);
      if (expires > new Date()) {
        console.log(
          `Token is not expired. Expires ${expires} and created at ${issued}`
        );
        return false;
      } else {
        console.log(`Token expired ${expires} and was created at ${issued}`);
        return true;
      }
    } catch (e) {
      console.error("could not parse token", e);
      return true;
    }
  }

  private parseToken(token: string): JwtToken {
    return JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf8")
    );
  }

  private async obtainJwtToken() {
    console.log("Logging into Enlighten with username/pass...");
    let { data: sessionId } = await axios.post(
      "https://enlighten.enphaseenergy.com/login/login.json",
      axios.toFormData({
        "user[email]": this.config.username,
        "user[password]": this.config.password,
      })
    );
    console.log(
      "Login successful. Got a session Id. Exchanging it for a token..."
    );
    let { data: sess } = await axios.post<string>(
      "https://entrez.enphaseenergy.com/tokens",
      {
        session_id: sessionId["session_id"],
        serial_num: this.config.gatewaySerial,
        username: this.config.username,
      }
    );
    let parsed = this.parseToken(sess);
    console.log(
      `Got a ${parsed.enphaseUser} token that will be valid until ${new Date(
        parsed.exp * 1000
      )}`
    );
    this.jwtToken = sess;
    this.apiInstance.defaults.headers["Authorization"] = `Bearer ${sess}`;
  }

  private async getWithRetryOnLoggedOut<T>(
    url: string,
    retry = true
  ): Promise<T> {
    try {
      const { data } = await this.apiInstance.get<T>(url);
      return data;
    } catch (e) {
      if (!retry) {
        console.log("Not retrying, propagating error");
        throw e;
      }
      if (axios.isAxiosError(e)) {
        let ae: AxiosError = e;
        if (ae.response?.status == 401) {
          console.log("You're not logged in. Fixing that before retrying");
          await this.login();
          return this.getWithRetryOnLoggedOut<T>(url, false);
        }
      }
      throw e;
    }
  }

  public async getProductionData() {
    return this.getWithRetryOnLoggedOut<ProdResponse>(
      "/production.json?details=1"
    );
  }

  public async getInverters() {
    return this.getWithRetryOnLoggedOut<Array<Inverter>>(
      "/api/v1/production/inverters"
    );
  }
}
