import { Client } from "mqtt";
import { AppConfig } from "./Config";

export function welcomePage(config: AppConfig["envoy"]) {
  return `
        <!doctype html>
        <html lang='en'>
            <head>
                <meta charset="utf-8">
                <title>Envoy exporter</title>
            </head>
            <body>
                <h1>Welcome to envoy exporter</h1>
                ${loginOrStatus(config.clientId, config.redirectUrl)}
            </body>
        </html>
    `;
}

function loginOrStatus(clientId: string, redirectUri: string) {
  const url = new URL("https://api.enphaseenergy.com/oauth/authorize");
  url.searchParams.append("response_type", "code");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", redirectUri);
  return `<a href="${url.toString()}">Login</a>`;
}
