# Austin Wade Smith - 2023

import requests
from Adafruit_DHT import read_retry, DHT11
from ambient_api.ambientapi import AmbientAPI
from time import sleep

# API Keys and Constants
OPENWEATHERMAP_API_KEY = 'your_openweathermap_api_key'
TIDES_API_URL = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8518750&product=one_minute_water_level&datum=mllw&units=metric&time_zone=gmt&application=web_services&format=json"
SUN_API_URL = f"http://api.openweathermap.org/data/2.5/weather?lat=40.719499&lon=-73.935809&appid={OPENWEATHERMAP_API_KEY}"
MOON_PHASE_API_URL = f"http://api.openweathermap.org/data/2.5/onecall?lat=40.719499&lon=-73.935809&exclude=current,minutely,hourly,alerts&appid={OPENWEATHERMAP_API_KEY}"

# Sensor Constants
DHT_PIN = 16  # GPIO pin for DHT11 sensor

def getWeather():
    """
    Gets weather data from the Ambient Weather station.
    Returns: Dictionary containing weather data with descriptive keys.
    """
    api = AmbientAPI()
    devices = api.get_devices()
    device = devices[0]
    sleep(1)
    reports = device.get_data()
    report = reports[0]
    
    return {
        'indoor': {
            'temperature': report['tempinf'],
            'humidity': report['humidityin']
        },
        'outdoor': {
            'temperature': report['tempf'],
            'humidity': report['humidity']
        },
        'wind': {
            'direction': report['winddir'],
            'speed': report['windspeedmph'],
            'gust': report['windgustmph']
        },
        'rain': {
            'hourly': report['hourlyrainin']
        },
        'solar': {
            'radiation': report['solarradiation'],
            'uv': report['uv']
        }
    }

def getBreeze():
    """
    Reads wind speed and direction from a direct sensor and triggers a subfunction if the breeze is north.
    """
    def wind_action():
        """
        Subfunction triggered when the breeze is north.
        Placeholder: Perform an action in DAODAO.
        """
        print("Wind is blowing from the north. Executing wind_action with the DAO...")

    weather = getWeather()
    wind_speed = weather['wind']['speed']
    wind_direction = weather['wind']['direction']

    # Check if wind direction is approximately north (0 degrees ± 10 degrees)
    if abs(wind_direction - 0) <= 10 or abs(wind_direction - 360) <= 10:
        print(f"Breeze detected: Speed = {wind_speed} m/s, Direction = {wind_direction}° (North)")
        wind_action()
    else:
        print(f"Breeze detected: Speed = {wind_speed} m/s, Direction = {wind_direction}° (Not North)")

def getTides():
    """
    Fetches data from the NOAA Tides API to check if the closest tide is high.
    """
    def tide_action():
        """
        Subfunction triggered when the tide is high.
        Placeholder: Perform an action with the DAO.
        """
        print("High tide detected. Executing tide_action with the DAO...")

    response = requests.get(TIDES_API_URL)
    if response.status_code == 200:
        data = response.json()
        water_level = float(data['data'][0]['v'])
        print(f"Current water level: {water_level} meters")

        if water_level > 1.5:
            tide_action()
        else:
            print("Tide is not high.")
    else:
        print(f"Error: Unable to fetch tide data (Status code: {response.status_code})")

def getSun():
    """
    Uses the OpenWeatherMap API to check if the sun is shining on the sensor.
    """
    def sun_action():
        """
        Subfunction triggered when the sun is shining.
        Placeholder: Perform an action with the DAO.
        """
        print("Sun is shining on the sensor. Executing sun_action with the DAO...")

    response = requests.get(SUN_API_URL)
    if response.status_code == 200:
        data = response.json()
        sunrise = data['sys']['sunrise']
        sunset = data['sys']['sunset']
        current_time = data['dt']

        if sunrise < current_time < sunset:
            print("The sun is shining.")
            sun_action()
        else:
            print("The sun is not shining.")
    else:
        print(f"Error: Unable to fetch sun data (Status code: {response.status_code})")

def getMoon():
    """
    Uses the OpenWeatherMap OneCall API to check if the moon is full or if there's an eclipse tonight.
    """
    def full_moon_action():
        """
        Subfunction triggered when the moon is full.
        Placeholder: Perform an action with the DAO.
        """
        print("Full moon detected. Executing full_moon_action with the DAO...")

    def eclipse_action():
        """
        Subfunction triggered when there's an eclipse tonight.
        Placeholder: Perform an action with the DAO.
        """
        print("Lunar eclipse detected for tonight. Executing eclipse_action with the DAO...")

    response = requests.get(MOON_PHASE_API_URL)
    if response.status_code == 200:
        data = response.json()
        moon_phase = data['daily'][0]['moon_phase']

        if 0.45 <= moon_phase <= 0.55:
            print("The moon is full.")
            full_moon_action()
        else:
            print("The moon is not full.")

        is_eclipse_tonight = False
        if is_eclipse_tonight:
            eclipse_action()
        else:
            print("No lunar eclipse tonight.")
    else:
        print(f"Error: Unable to fetch moon data (Status code: {response.status_code})")
