from flask import Flask, request, jsonify, send_from_directory, render_template, redirect
from flask_cors import CORS, cross_origin
import os
import time
import bech32
import json
import requests
from dotenv import load_dotenv
from geographiclib.geodesic import Geodesic

load_dotenv()

from ambient_api.ambientapi import AmbientAPI

app = Flask(__name__, static_folder='frontend/out', static_url_path='/')
cors = CORS(app)

# Cache for storing the last successful wind data
wind_data_cache = None

wind_trust_dao_contract = "neutron1hvdx9p56hz8m2604ls8ss3j4u8nxx8ju6kjvf7hewf7p87cksxpq3pllfs"

def get_config():
    res = requests.get(f"https://indexer.daodao.zone/neutron-1/contract/{wind_trust_dao_contract}/daoCore/listItems")
    res.raise_for_status()
    return dict(res.json())

@app.route('/_next/<path:path>')
def next_static(path):
    return send_from_directory('frontend/out/_next', path)

@app.route('/api/wind', methods=['GET'])
@cross_origin()
def get_wind_data():
    global wind_data_cache
    
    # Retrieve API keys from environment variables
    api_key = os.getenv('AMBIENT_API_KEY')
    app_key = os.getenv('AMBIENT_APPLICATION_KEY')

    # Initialize the AmbientAPI with the API keys
    api = AmbientAPI(AMBIENT_API_KEY=api_key, AMBIENT_APPLICATION_KEY=app_key)

    try:
        devices = api.get_devices()

        if not devices:
            if wind_data_cache:
                return jsonify(wind_data_cache), 200
            return jsonify({"error": "No devices found and no cached data available."}), 404

        device = devices[0]  # Get the first device
        time.sleep(1)  # Pause for a second to avoid API limits

        # Get the latest data from the device
        latest_data = device.get_data()

        if isinstance(latest_data, list) and len(latest_data) > 0:
            latest_data = latest_data[0]  # Get the first item in the list
            wind_direction = latest_data.get('winddir', 'N/A')
            wind_speed = latest_data.get('windspeedmph', 'N/A')

            config = get_config()
            threshold_percent = float(config['azimuth_threshold_percent'])
            destination_coords = [float(coord) for coord in config['destination_coordinates'].split(',')]

            # from position of device to desired destination
            device_coords = [40.687668, -73.955505]
            azimuth = (Geodesic.WGS84.Inverse(*device_coords, *destination_coords)['azi1'] + 360) % 360

            threshold_delta = threshold_percent / 100 * 90
            azimuth_lower_bound = azimuth - threshold_delta + threshold_delta
            azimuth_upper_bound = azimuth + threshold_delta + threshold_delta
            is_open = azimuth_lower_bound <= wind_direction + threshold_delta and azimuth_upper_bound >= wind_direction + threshold_delta

            response_data = {
                "wind_direction": wind_direction,
                "wind_speed": wind_speed,
                "destination": destination_coords,
                "azimuth": azimuth,
                "threshold_percent": threshold_percent,
                "is_open": is_open
            }
            
            # Update cache with the latest successful data
            wind_data_cache = response_data
            
            return jsonify(response_data)
        else:
            if wind_data_cache:
                return jsonify(wind_data_cache), 200
            return jsonify({"error": "No data available and no cached data available."}), 404
            
    except Exception as e:
        if wind_data_cache:
            return jsonify(wind_data_cache), 200
        return jsonify({"error": f"Failed to get wind data: {str(e)}"}), 500

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
