import http from "http";
import { Bridge } from "./Bridge";
import { AppConfig } from "./Config";

export interface EnphaseTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  enl_uid: string;
  enl_cid: string;
  enl_password_last_changed: string;
  is_internal_app: boolean;
  app_type: string;
  jti: string;
}

export class HttpServer {
  private hostname = process.env["HTTP_LISTEN_ADDRESS"] || "0.0.0.0";
  private port = Number(process.env["HTTP_LISTEN_PORT"] || 3000);
  private server: http.Server<
    typeof http.IncomingMessage,
    typeof http.ServerResponse
  >;

  constructor(bridge: Bridge) {
    this.server = http.createServer(async (req, res) => {
      try {
        const uri = new URL(req.url!, `http://${req.headers.host}`);
        switch (uri.pathname) {
          case "/":
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/plain");
            res.end("This is the Envoy MQTT exporter");
            break;
          case "/inspect":
            const [prod, inverters] = await Promise.all([
              bridge.api.getProductionData(),
              bridge.api.getInverters(),
            ]);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ prod, inverters }));
            break;
          case "/_health":
            if (
              bridge.lastMqttDispatch &&
              bridge.lastMqttDispatch >
                new Date(new Date().getTime() - 5 * 60_000)
            ) {
              res.statusCode = 200;
            } else {
              res.statusCode = 500;
            }
            res.setHeader("Content-Type", "text/plain");
            res.end("Last dispatch " + bridge.lastMqttDispatch);
            break;
          default:
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain");
            res.end("Not found");
        }
      } catch (e) {
        console.error("Errorred", e);
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain");
        res.end(`Error ${e}`);
      }
    });
  }

  public start() {
    this.server.listen(this.port, this.hostname, () => {
      console.log(`Server running at http://localhost:${this.port}/`);
    });
  }

  public stop() {
    this.server.close();
  }
}
