from flask import Flask, jsonify
from ambient_api.ambientapi import AmbientAPI
import os
import time

app = Flask(__name__)

@app.route('/', methods=['GET'])
def home():
    return "Welcome to River Computer"

@app.route('/wind', methods=['GET'])
def get_wind_data():
    # Retrieve API keys from environment variables
    api_key = os.getenv('AMBIENT_API_KEY')
    app_key = os.getenv('AMBIENT_APPLICATION_KEY')

    # Initialize the AmbientAPI with the API keys
    api = AmbientAPI(api_key=api_key, application_key=app_key)

    devices = api.get_devices()

    if not devices:
        return jsonify({"error": "No devices found."}), 404

    device = devices[0]  # Get the first device
    time.sleep(1)  # Pause for a second to avoid API limits

    # Get the latest data from the device
    latest_data = device.get_data()

    if isinstance(latest_data, list) and len(latest_data) > 0:
        latest_data = latest_data[0]  # Get the first item in the list
        wind_direction = latest_data.get('winddir', 'N/A')
        wind_speed = latest_data.get('windspeedmph', 'N/A')

        return jsonify({
            "wind_direction": wind_direction,
            "wind_speed": wind_speed
        })
    else:
        return jsonify({"error": "No data available."}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
