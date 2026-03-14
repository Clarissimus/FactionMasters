import requests
import json
import os

# -------------------------------------------------------
# CONFIGURATION — fill in your plaidhatgames.com login
# -------------------------------------------------------
PHG_EMAIL    = os.environ.get("PHG_EMAIL", "YOUR_EMAIL_HERE")
PHG_PASSWORD = os.environ.get("PHG_PASSWORD", "YOUR_PASSWORD_HERE")
# -------------------------------------------------------

LOGIN_URL    = "https://www.plaidhatgames.com/accounts/login/?next=/swo/rankings/latest/"
RANKINGS_URL = "https://www.plaidhatgames.com/swo/rankings/latest/"
OUTPUT_FILE  = "rankings.json"

def fetch_rankings():
    session = requests.Session()

    # Step 1: GET the login page to retrieve the CSRF token
    print("Fetching login page for CSRF token...")
    resp = session.get(LOGIN_URL)
    resp.raise_for_status()

    # Extract the csrfmiddlewaretoken from the page
    csrf_token = None
    for line in resp.text.splitlines():
        if "csrfmiddlewaretoken" in line and 'value="' in line:
            start = line.index('value="') + 7
            end   = line.index('"', start)
            csrf_token = line[start:end]
            break

    if not csrf_token:
        # Fallback: read from cookies
        csrf_token = session.cookies.get("csrftoken")

    if not csrf_token:
        raise RuntimeError("Could not find CSRF token on login page.")

    print(f"Got CSRF token: {csrf_token[:10]}...")

    # Step 2: POST login credentials
    print("Logging in...")
    login_data = {
        "login":              PHG_EMAIL,
        "password":           PHG_PASSWORD,
        "csrfmiddlewaretoken": csrf_token,
        "next":               "/swo/rankings/latest/",
    }
    headers = {
        "Referer": LOGIN_URL,
    }
    resp = session.post(LOGIN_URL, data=login_data, headers=headers)
    resp.raise_for_status()

    # Check we actually logged in (if we're back on the login page, credentials were wrong)
    if "/accounts/login/" in resp.url:
        raise RuntimeError("Login failed — check your email and password.")

    print("Login successful!")

    # Step 3: Fetch the rankings JSON
    print("Fetching rankings...")
    resp = session.get(RANKINGS_URL)
    resp.raise_for_status()

    data = resp.json()

    if not data.get("ok"):
        raise RuntimeError(f"Rankings API returned an error: {data}")

    rankings = data["data"]["rankings"]
    season   = data["data"]["season"]["name"]

    # Step 4: Build a clean summary — top player per faction only
    # Skip "Mercenary" and "factions" which are empty
    SKIP_KEYS = {"all", "all_custom", "factions", "Mercenary"}

    top_players = []
    for faction, players in rankings.items():
        if faction in SKIP_KEYS:
            continue
        if not players:
            continue
        top = players[0]  # Already sorted by ELO descending
        top_players.append({
            "faction":  faction,
            "username": top["user__username"],
            "elo":      top["elo"],
        })

    # Sort by ELO descending so seed #1 = highest ELO
    top_players.sort(key=lambda x: x["elo"], reverse=True)

    # Pad to 32 with BYE entries if needed
    while len(top_players) < 32:
        top_players.append({
            "faction":  "BYE",
            "username": "BYE",
            "elo":      0,
        })

    output = {
        "season":      season,
        "top_players": top_players,
        "fetched_at":  __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Done! Wrote {len(top_players)} entries to {OUTPUT_FILE}")

if __name__ == "__main__":
    fetch_rankings()
