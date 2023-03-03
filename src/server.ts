import axios from "axios";
import http from "http";
import { EnvoyResponse } from "./Bridge";
import { AppConfig } from "./Config";
import { welcomePage } from "./WelcomPage";

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

export class AuthServer {
  private hostname = process.env["HTTP_LISTEN_ADDRESS"] || "0.0.0.0";
  private port = Number(process.env["HTTP_LISTEN_PORT"] || 3000);
  private server: http.Server<
    typeof http.IncomingMessage,
    typeof http.ServerResponse
  >;

  constructor(config: AppConfig) {
    this.server = http.createServer(async (req, res) => {
      try {
        const uri = new URL(req.url!, `http://${req.headers.host}`);
        switch (uri.pathname) {
          case "/":
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html");
            res.end(welcomePage(config.envoy));
            break;
          case "/auth-callback":
            const code = uri.searchParams.get("code");
            if (!code) {
              throw new Error("Code not provided");
            }
            const token = await getToken(code, config.envoy);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(token));
            break;
          case "/_health":
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/plain");
            res.end("IMOK");
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

async function getToken(code: string, config: AppConfig["envoy"]) {
  const { data } = await axios.post<EnvoyResponse>(
    "https://api.enphaseenergy.com/oauth/token",
    "",
    {
      params: {
        grant_type: "authorization_code",
        redirect_uri: config.redirectUrl,
        code,
      },
      headers: {
        Authorization: `Basic ${base64(
          `${config.clientId}:${config.clientSecret}`
        )}`,
      },
    }
  );
  return data;
}

function base64(content: string) {
  return Buffer.from(content).toString("base64");
}
