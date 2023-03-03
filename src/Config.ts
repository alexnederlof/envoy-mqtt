export interface AppConfig {
  readonly mqtt: {
    address: string;
    user?: string;
    password?: string;
  };
  readonly envoy: {
    host: string;
    clientId: string;
    clientSecret: string;
    redirectUrl: string;
  };
}

export function parse(): AppConfig {
  return {
    mqtt: {
      address: getOrError("MQTT_ADDRESS"),
      user: process.env["MQTT_USER"]?.trim(),
      password: process.env["MQTT_PASSWORD"]?.trim(),
    },
    envoy: {
      clientId: getOrError("ENVOY_CLIENT_ID"),
      clientSecret: getOrError("ENVOY_CLIENT_SECRET"),
      redirectUrl: getOrError("ENVOY_REDIRECT_URL"),
      host: getOrError("ENVOY_HOST"),
    },
  };
}

function getOrError(key: string) {
  const val = process.env[key]?.trim();
  if (!val || !val.length) {
    throw new Error(`Missing parameters ${key}`);
  }
  return val;
}
