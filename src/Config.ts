export interface AppConfig {
  readonly mqtt: {
    address: string;
    user?: string;
    password?: string;
  };
  readonly envoy: {
    host: string;
    username: string;
    password: string;
    gatewaySerial: string;
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
      username: getOrError("ENVOY_USERNAME"),
      password: getOrError("ENVOY_PASSWORD"),
      host: getOrError("ENVOY_HOST"),
      gatewaySerial: getOrError("ENVOY_GATEWAY_SERIAL"),
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
