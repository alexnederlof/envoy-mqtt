# Envoy to MQTT

This is a simple application that polls your local envoy
gateway every minute for it's production values. Storage
has not been implemented.

## Authenticating

To get a token:

- Go to [https://entrez.enphaseenergy.com]()
- Select "commisionned gateway"
- Enter you system ID (it's in the URL when you go to [https://enlighten.enphaseenergy.com]())
- It should load and show your Gateway ID. In my case it didn't
  and I had to manipulate the HTML to get the gateway ID in there.
- You now get a token.

## Configuration

The following items need to be configured.

| Key               | Value                                                     | Required or default              |
| ----------------- | --------------------------------------------------------- | -------------------------------- |
| MQTT_ADDRESS      | IP or hostname of MQTT service                            | Required                         |
| MQTT_USER         | MQTT Username                                             | Default: No user/pass by default |
| MQTT_PASSWORD     | MQTT Password                                             | Default: No user/pass by default |
| MQTT_TOPIC_PREFIX | the prefix for MQTT Topics                                | tradfri                          |
| ENVOY_HOST        | Base URL of your envoy station, like https://192.168.1.23 | required                         |
| ENVOY_TOKEN       | The token you got as described above                      | required                         |

On startup a `.env` file is also read in case you want to configure by file.
