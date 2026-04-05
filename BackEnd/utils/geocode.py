import requests
import logging
import time

logger = logging.getLogger(__name__)

# Simple in-memory dict cache for reverse geocoding API responses natively saving HTTP limits.
_geocode_cache = {}

def get_city_name(lat: float, lon: float) -> str:
    """
    Reverse geocodes a lat/lon decimal pairing to a human-readable city or region name using free Nominatim servers.
    Caches queries grouped roughly internally by ~1km grids.
    """
    if lat is None or lon is None:
        return "Unknown Location"
        
    cache_key = f"{round(lat, 2):.2f},{round(lon, 2):.2f}"
    
    if cache_key in _geocode_cache:
        # logger.debug(f"Geocode cache hit: {cache_key}")
        return _geocode_cache[cache_key]

    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "lat": lat,
        "lon": lon,
        "format": "jsonv2",
        "zoom": 10
    }
    
    headers = {
        "User-Agent": "CloudGraph-PhotoApp-v2"
    }

    # Simple retry logic for transient errors
    for attempt in range(2):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=3)
            response.raise_for_status()
            data = response.json()
            
            address = data.get("address", {})
            city = (
                address.get("city") or 
                address.get("town") or 
                address.get("village") or 
                address.get("suburb") or
                address.get("county") or
                address.get("state") or 
                address.get("country")
            )
            
            label = str(city) if city else "Unknown Location"
            _geocode_cache[cache_key] = label
            return label
            
        except Exception as e:
            if attempt == 0:
                logger.warning(f"Nominatim attempt 1 failed for {lat},{lon}, retrying... error: {e}")
                time.sleep(1)
                continue
            logger.error(f"Nominatim final failure for {lat},{lon}: {e}")
            return "Unknown Location"

    return "Unknown Location"
