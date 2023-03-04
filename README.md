# Envoy to MQTT

This is a simple application that polls your local envoy
gateway every minute for it's production values. Storage
has not been implemented.

Note that the envoy login system [is a hot mess](https://support.enphase.com/s/question/0D53m00006ySLuRCAW/unimpressed-with-loss-of-local-api-connectivity-to-envoys),
and it took some time to make this work.

According to [their documentation](https://enphase.com/download/accessing-iq-gateway-local-apis-or-local-ui-token-based-authentication) you should be able to generate
a token locally that you can use. I turns out that doesn't work
(at the time of writing) and you need to create a session cookie
instead. This code fixes that for you.

Once the app is running you can access

- `/` to see just a hello message
- `/_health` to get a `200` if it successfully emitted to MQTT in the last 5 minutes
- `/inspect` to see what data it's getting from envoy

## Configuration

The following items need to be configured.

| Key                  | Value                                                                                                         | Required or default              |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| MQTT_ADDRESS         | IP or hostname of MQTT service                                                                                | Required                         |
| MQTT_USER            | MQTT Username                                                                                                 | Default: No user/pass by default |
| MQTT_PASSWORD        | MQTT Password                                                                                                 | Default: No user/pass by default |
| MQTT_TOPIC_PREFIX    | the prefix for MQTT Topics. Not that this code naively assumes you only have one gateway, and ignores others. | envoy/                           |
| ENVOY_HOST           | Base URL of your envoy station, like https://192.168.1.23                                                     | required                         |
| ENVOY_USERNAME       | The token you got as described above                                                                          | required                         |
| ENVOY_PASSWORD       | The token you got as described above                                                                          | required                         |
| ENVOY_GATEWAY_SERIAL | The token you got as described above                                                                          | required                         |
| HTTP_LISTEN_ADDRESS  | To what IP or hostname to bind the HTTP server.                                                               | Default is `0.0.0.0`             |
| HTTP_LISTEN_PORT     | What port to run the server on.                                                                               | Default is `3000`                |

On startup a `.env` file is also read in case you want to configure by file.
