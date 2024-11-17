import requests
from Adafruit_DHT import read_retry, DHT11

# API Keys and Constants
OPENWEATHERMAP_API_KEY = 'your_openweathermap_api_key'
TIDES_API_URL = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8518750&product=one_minute_water_level&datum=mllw&units=metric&time_zone=gmt&application=web_services&format=json"
SUN_API_URL = f"http://api.openweathermap.org/data/2.5/weather?lat=40.719499&lon=-73.935809&appid={OPENWEATHERMAP_API_KEY}"
MOON_PHASE_API_URL = f"http://api.openweathermap.org/data/2.5/onecall?lat=40.719499&lon=-73.935809&exclude=current,minutely,hourly,alerts&appid={OPENWEATHERMAP_API_KEY}"

# Sensor Constants
DHT_PIN = 16  # GPIO pin for DHT11 sensor

def breeze():
    """
    Reads wind speed and direction from a direct sensor and triggers a subfunction if the breeze is north.
    """
    def wind_action():
        """
        Subfunction triggered when the breeze is north.
        Placeholder: Perform an action with the DAO (Data Access Object).
        """
        print("Wind is blowing from the north. Executing wind_action with the DAO...")

    # Simulate wind sensor reading (replace with actual sensor code as needed)
    wind_speed = 5.0  # Example wind speed in m/s
    wind_direction = 5  # Example wind direction in degrees

    # Check if wind direction is approximately north (0 degrees ± 10 degrees)
    if abs(wind_direction - 0) <= 10 or abs(wind_direction - 360) <= 10:
        print(f"Breeze detected: Speed = {wind_speed} m/s, Direction = {wind_direction}° (North)")
        wind_action()
    else:
        print(f"Breeze detected: Speed = {wind_speed} m/s, Direction = {wind_direction}° (Not North)")


def tides():
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

        # Placeholder condition: Assume high tide if water level exceeds a threshold
        if water_level > 1.5:
            tide_action()
        else:
            print("Tide is not high.")
    else:
        print(f"Error: Unable to fetch tide data (Status code: {response.status_code})")


def sun():
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

        # Check if current time is between sunrise and sunset
        if sunrise < current_time < sunset:
            print("The sun is shining.")
            sun_action()
        else:
            print("The sun is not shining.")
    else:
        print(f"Error: Unable to fetch sun data (Status code: {response.status_code})")


def moon():
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
        moon_phase = data['daily'][0]['moon_phase']  # Value between 0.0 and 1.0 (0.5 = full moon)

        # Check for full moon
        if 0.45 <= moon_phase <= 0.55:
            print("The moon is full.")
            full_moon_action()
        else:
            print("The moon is not full.")

        # Placeholder condition for eclipse (modify as needed for real data)
        is_eclipse_tonight = False
        if is_eclipse_tonight:
            eclipse_action()
        else:
            print("No lunar eclipse tonight.")
    else:
        print(f"Error: Unable to fetch moon data (Status code: {response.status_code})")
