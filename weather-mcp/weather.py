from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
# FastMCP automatically handles the registration of tools and the stdio transport
mcp = FastMCP("weather")

# Constants
NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "mcp-weather/1.0 (contact@example.com)" # Added placeholder contact

async def make_nws_request(url: str) -> dict[str, Any] | None:
    """Make a request to the NWS API with proper error handling."""
    headers = {
        "User-Agent": USER_AGENT, 
        "Accept": "application/geo+json"
    }
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            # In a production MCP, you might want to log this error
            return None

def format_alert(feature: dict) -> str:
    """Format an alert feature into a readable string."""
    props = feature.get("properties", {})
    return (
        f"Event: {props.get('event', 'Unknown')}\n"
        f"Area: {props.get('areaDesc', 'Unknown')}\n"
        f"Severity: {props.get('severity', 'Unknown')}\n"
        f"Description: {props.get('description', 'No description available')}\n"
        f"Instructions: {props.get('instruction', 'No specific instructions provided')}"
    )

@mcp.tool()
async def get_alerts(state: str) -> str:
    """Get active weather alerts for a US state.

    Args:
        state: Two-letter US state code (e.g. CA, NY)
    """
    url = f"{NWS_API_BASE}/alerts/active/area/{state.upper()}"
    data = await make_nws_request(url)

    if not data or "features" not in data:
        return f"Unable to fetch alerts for {state}."

    if not data["features"]:
        return f"No active alerts for {state}."

    # Limit alerts to prevent hitting context window limits for the LLM
    alerts = [format_alert(f) for f in data["features"][:10]]
    return "\n---\n".join(alerts)

@mcp.tool()
async def get_forecast(latitude: float, longitude: float) -> str:
    """Get global weather forecast using Open-Meteo."""

    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={latitude}&longitude={longitude}"
        f"&daily=temperature_2m_max,temperature_2m_min"
        f"&current_weather=true&timezone=auto"
    )

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            data = response.json()
        except Exception:
            return "Unable to fetch forecast."

    current = data.get("current_weather", {})
    daily = data.get("daily", {})

    output = []

    # Current weather
    if current:
        output.append(
            f"**Current Weather**\n"
            f"Temp: {current.get('temperature')}°C\n"
            f"Wind: {current.get('windspeed')} km/h\n"
        )

    # Daily forecast
    dates = daily.get("time", [])
    max_temps = daily.get("temperature_2m_max", [])
    min_temps = daily.get("temperature_2m_min", [])

    for i in range(min(5, len(dates))):
        output.append(
            f"**{dates[i]}**\n"
            f"Max: {max_temps[i]}°C\n"
            f"Min: {min_temps[i]}°C"
        )

    return "\n---\n".join(output)
if __name__ == "__main__":
    # Running via 'mcp run' or direct python execution
    mcp.run()