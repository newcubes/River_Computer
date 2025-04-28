from flask import Flask, request, jsonify
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

app = Flask(__name__)
cors = CORS(app)

wind_trust_dao_contract = "neutron1hvdx9p56hz8m2604ls8ss3j4u8nxx8ju6kjvf7hewf7p87cksxpq3pllfs"

def get_config():
    res = requests.get(f"https://indexer.daodao.zone/neutron-1/contract/{wind_trust_dao_contract}/daoCore/listItems")
    res.raise_for_status()
    return dict(res.json())

@app.route('/', methods=['GET'])
def home():
    return "Welcome to River Computer"

@app.route('/wind', methods=['GET'])
@cross_origin()
def get_wind_data():
    # Retrieve API keys from environment variables
    api_key = os.getenv('AMBIENT_API_KEY')
    app_key = os.getenv('AMBIENT_APPLICATION_KEY')

    # Initialize the AmbientAPI with the API keys
    api = AmbientAPI(AMBIENT_API_KEY=api_key, AMBIENT_APPLICATION_KEY=app_key)

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

        return jsonify({
            "wind_direction": wind_direction,
            "wind_speed": wind_speed,
            "destination": destination_coords,
            "azimuth": azimuth,
            "threshold_percent": threshold_percent,
            "is_open": is_open
        })
    else:
        return jsonify({"error": "No data available."}), 404

@app.route('/join', methods=['POST'])
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

    ## EXECUTE ON CHAIN

    # authz_exec_tx_submission = os.popen(f"echo '{json.dumps(full_tx_pre_authz)}' | {neutrond_bin} tx authz exec /dev/stdin --from wind --fee-granter {river_computer_dao_contract} --gas auto --gas-prices 0.01untrn --gas-adjustment 1.5 --broadcast-mode sync --output json --yes 2>&1").read()

    # return jsonify(authz_exec_tx_submission)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
