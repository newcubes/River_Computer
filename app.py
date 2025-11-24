from flask import Flask, request, jsonify, send_from_directory, render_template, redirect
from flask_cors import CORS, cross_origin
import os
import time
import bech32
import json
import requests
from collections import deque
from datetime import datetime
from dotenv import load_dotenv
from geographiclib.geodesic import Geodesic

load_dotenv()

from ambient_api.ambientapi import AmbientAPI

app = Flask(__name__, static_folder='frontend/out', static_url_path='/')
cors = CORS(app)

# Cache for storing the last successful wind data
wind_data_cache = None

# Historical wind data storage (max 150 readings)
WIND_HISTORY_FILE = 'wind_history.json'
WIND_HISTORY_MAX = 150
wind_history = deque(maxlen=WIND_HISTORY_MAX)

wind_trust_dao_contract = "neutron1hvdx9p56hz8m2604ls8ss3j4u8nxx8ju6kjvf7hewf7p87cksxpq3pllfs"

def get_config():
    res = requests.get(f"https://indexer.daodao.zone/neutron-1/contract/{wind_trust_dao_contract}/daoCore/listItems")
    res.raise_for_status()
    return dict(res.json())

def load_wind_history():
    """Load wind history from JSON file"""
    global wind_history
    if os.path.exists(WIND_HISTORY_FILE):
        try:
            with open(WIND_HISTORY_FILE, 'r') as f:
                data = json.load(f)
                wind_history = deque(data[-WIND_HISTORY_MAX:], maxlen=WIND_HISTORY_MAX)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading wind history: {e}")
            wind_history = deque(maxlen=WIND_HISTORY_MAX)

def save_wind_history():
    """Save wind history to JSON file"""
    try:
        with open(WIND_HISTORY_FILE, 'w') as f:
            json.dump(list(wind_history), f)
    except IOError as e:
        print(f"Error saving wind history: {e}")

def add_wind_reading(wind_direction, wind_speed, is_open):
    """Adds a new wind reading to history, with deduplication."""
    global wind_history
    timestamp = datetime.utcnow().isoformat()
    new_reading = {
        "timestamp": timestamp,
        "wind_direction": wind_direction,
        "wind_speed": wind_speed,
        "is_open": is_open
    }

    # Deduplication: only add if direction changes significantly (> 0.5 degrees)
    if not wind_history or abs(wind_history[-1]['wind_direction'] - wind_direction) > 0.5:
        wind_history.append(new_reading)
        save_wind_history()
        print(f"Recorded new wind reading: {wind_direction}° at {timestamp}")
    else:
        print(f"Skipping recording (direction unchanged): {wind_direction}° at {timestamp}")

# Load history on startup
load_wind_history()

def get_wind_data_ambient():
    """Get wind data from Ambient Weather API"""
    api_key = os.getenv('AMBIENT_API_KEY')
    app_key = os.getenv('AMBIENT_APPLICATION_KEY')
    
    api = AmbientAPI(AMBIENT_API_KEY=api_key, AMBIENT_APPLICATION_KEY=app_key)
    devices = api.get_devices()
    
    if not devices:
        return None, None
    
    device = devices[0]  # Get the first device
    time.sleep(1)  # Pause for a second to avoid API limits
    
    latest_data = device.get_data()
    
    if isinstance(latest_data, list) and len(latest_data) > 0:
        latest_data = latest_data[0]
        wind_direction = latest_data.get('winddir', 'N/A')
        wind_speed = latest_data.get('windspeedmph', 'N/A')
        return wind_direction, wind_speed
    
    return None, None

def get_wind_data_openweather():
    """Get wind data from OpenWeatherMap API"""
    api_key = os.getenv('OPENWEATHERMAP_API_KEY')
    lat, lon = 40.687668, -73.955505  # Brooklyn coordinates
    
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    data = response.json()
    
    wind_data = data.get('wind', {})
    wind_direction = wind_data.get('deg', 'N/A')  # Already in degrees 0-360
    wind_speed_ms = wind_data.get('speed', 'N/A')  # m/s
    
    # Convert m/s to mph
    if isinstance(wind_speed_ms, (int, float)):
        wind_speed = wind_speed_ms * 2.237  # Convert m/s to mph
    else:
        wind_speed = 'N/A'
    
    return wind_direction, wind_speed

@app.route('/_next/<path:path>')
def next_static(path):
    return send_from_directory('frontend/out/_next', path)

@app.route('/api/wind', methods=['GET'])
@cross_origin()
def get_wind_data():
    global wind_data_cache
    
    # Check which API to use (default to 'openweather' if not set)
    # Set WIND_API_SOURCE=ambient to use Ambient Weather, or WIND_API_SOURCE=openweather for OpenWeatherMap
    api_source = os.getenv('WIND_API_SOURCE', 'openweather').lower()
    
    try:
        # Get wind data from the selected API
        if api_source == 'ambient':
            wind_direction, wind_speed = get_wind_data_ambient()
        else:  # default to openweather
            wind_direction, wind_speed = get_wind_data_openweather()
        
        # If we didn't get valid data, try cache or return error
        if wind_direction == 'N/A' or wind_direction is None:
            if wind_data_cache:
                return jsonify(wind_data_cache), 200
            return jsonify({"error": "No wind data available and no cached data available."}), 404
        
        # Only proceed if we have valid wind direction data
        if not isinstance(wind_direction, (int, float)) or wind_direction < 0 or wind_direction > 360:
            if wind_data_cache:
                return jsonify(wind_data_cache), 200
            return jsonify({"error": "Invalid wind direction data from API"}), 500
        
        config = get_config()
        threshold_percent = float(config['azimuth_threshold_percent'])
        destination_coords = [float(coord) for coord in config['destination_coordinates'].split(',')]

        # from position of device to desired destination
        device_coords = [40.687668, -73.955505]
        azimuth = (Geodesic.WGS84.Inverse(*device_coords, *destination_coords)['azi1'] + 360) % 360

        threshold_delta = threshold_percent / 100 * 90
        azimuth_lower_bound = (azimuth - threshold_delta + 360) % 360
        azimuth_upper_bound = (azimuth + threshold_delta) % 360
        
        # Check if wind direction is within the threshold range
        # Handle wrap-around at 0/360 degrees
        if azimuth_lower_bound > azimuth_upper_bound:
            # Range wraps around 0/360
            is_open = wind_direction >= azimuth_lower_bound or wind_direction <= azimuth_upper_bound
        else:
            # Normal range
            is_open = azimuth_lower_bound <= wind_direction <= azimuth_upper_bound

        response_data = {
            "wind_direction": wind_direction,
            "wind_speed": wind_speed,
            "destination": destination_coords,
            "azimuth": azimuth,
            "threshold_percent": threshold_percent,
            "threshold_lower_bound": azimuth_lower_bound,
            "threshold_upper_bound": azimuth_upper_bound,
            "is_open": is_open,
            "api_source": api_source  # Include which API was used for debugging
        }
        
        # Store in history (only if we have valid numeric wind_direction)
        # Only add if it's different from the last reading to avoid duplicates
        if isinstance(wind_direction, (int, float)):
            # Check if this reading is different from the last one
            if len(wind_history) == 0:
                # First reading, always add
                add_wind_reading(wind_direction, wind_speed, is_open)
            else:
                last_reading = wind_history[-1]
                # Only add if wind direction changed (allowing for small rounding differences)
                if abs(last_reading['wind_direction'] - wind_direction) > 0.5:
                    add_wind_reading(wind_direction, wind_speed, is_open)
        
        # Update cache with the latest successful data
        wind_data_cache = response_data
        
        return jsonify(response_data)
            
    except Exception as e:
        if wind_data_cache:
            return jsonify(wind_data_cache), 200
        return jsonify({"error": f"Failed to get wind data: {str(e)}"}), 500

@app.route('/api/wind/history', methods=['GET'])
@cross_origin()
def get_wind_history():
    """Return the last 150 wind direction readings"""
    # Return as list, newest first (deque is already in order, newest at end)
    # Reverse to get newest first
    history_list = list(wind_history)
    history_list.reverse()  # Newest first
    
    return jsonify({
        "count": len(history_list),
        "readings": history_list
    })

@app.route('/api/join', methods=['POST'])
@cross_origin()
def join():
    address = request.get_json(force=True)['address']
    try:
        hrp, data = bech32.bech32_decode(address)
        if hrp is None or hrp != "neutron" or data is None:
            raise Exception("Invalid address")
    except Exception as e:
        return jsonify({"error": "Invalid address"}), 401

    neutrond_bin = "/home/river/.local/bin/neutrond"
    wind_trust_contract_cw4 = "neutron1hstf985wqeqgxtg99e8pm99gzmguxwyzywunk5ntx3ksjejccwcqsdwwjf"
    river_computer_dao_contract = "neutron15078ks644a6pxmknyhqkkpgackggxcm47zgkzu4lkwcnwp9gwh6q6xmegw"

    # authz exec via wind trust
    add_member_payload = json.dumps({
        "update_members": {
            "add": [{
                "weight": 1,
                "addr": address
            }],
            "remove": []
        }
    })
    add_member_tx = json.loads(os.popen(f"{neutrond_bin} tx wasm execute {wind_trust_contract_cw4} '{add_member_payload}' --generate-only --from {wind_trust_dao_contract}").read())

    # authz exec via river computer
    spend_tx = json.loads(os.popen(f"{neutrond_bin} tx bank send {river_computer_dao_contract} {address} 1untrn --generate-only --from {river_computer_dao_contract}").read())
    fee_grant_tx = json.loads(os.popen(f"{neutrond_bin} tx feegrant grant {river_computer_dao_contract} {address} --generate-only --from {river_computer_dao_contract}").read())

    full_tx_pre_authz = add_member_tx
    full_tx_pre_authz['body']['messages'].append(
        spend_tx['body']['messages'][0]
    )
    full_tx_pre_authz['body']['messages'].append(
        fee_grant_tx['body']['messages'][0]
    )

    # for now, don't execute
    return jsonify(full_tx_pre_authz)

# Serve Next.js static files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        return {"error": "Not found"}, 404
    
    # Check if path is a file that exists in the out directory
    static_file_path = os.path.join('frontend/out', path)
    if os.path.isfile(static_file_path):
        return send_from_directory('frontend/out', path)
    
    # If path includes an extension but file doesn't exist, return 404
    if '.' in path:
        return {"error": "Not found"}, 404
    
    # For all other paths (routes), serve the index.html
    if path and not path.endswith('/'):
        # Redirect non-trailing slash routes to ones with trailing slash to match Next.js export format
        return redirect(f'/{path}/')
        
    # Handle paths with trailing slash by appending index.html
    if path.endswith('/'):
        path = f"{path}index.html"
    else:
        path = f"{path}/index.html"
    
    try:
        return send_from_directory('frontend/out', path)
    except:
        # If specific page not found, return the index.html page
        return send_from_directory('frontend/out', 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
