#!/usr/bin/env python3
"""
Ohio Dry Cleaner Outreach - Outscraper API Integration
Uses google-maps-search endpoint to find dry cleaners across Ohio
"""
import os
import json
import requests
import time
from datetime import datetime

API_KEY = os.getenv("OUTSCRAPER_API_KEY")
OUT_FILE = "ohio-drycleaners-new.json"

def search_dry_cleaners(query="dry cleaner Ohio", limit=15):
    """Search for dry cleaners using Outscraper Google Maps API"""
    url = "https://api.outscraper.com/google-maps-search"
    headers = {"X-API-KEY": API_KEY, "Content-Type": "application/json"}
    payload = {"query": query, "limit": limit}
    
    print(f"Searching for: {query}...")
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    
    result = response.json()
    request_id = result.get("id")
    print(f"Request ID: {request_id}, Status: {result.get('status')}")
    
    # Poll for completion
    status = result.get("status")
    while status == "Pending":
        time.sleep(2)
        check_url = f"https://api.outscraper.cloud/requests/{request_id}"
        resp = requests.get(check_url, headers=headers)
        result = resp.json()
        status = result.get("status")
        print(f"Status: {status}")
    
    return result

def parse_results(data):
    """Extract relevant fields from Outscraper results"""
    businesses = []
    for entry in data.get("data", [[]])[0]:
        biz = {
            "name": entry.get("name"),
            "phone": entry.get("phone"),
            "address": entry.get("address"),
            "website": entry.get("website"),
            "email": entry.get("email"),  # May be None - needs enrichment
            "rating": entry.get("rating"),
            "reviews": entry.get("reviews"),
            "source": "outscraper"
        }
        businesses.append(biz)
    return businesses

def save_businesses(businesses, out_file):
    """Save businesses to JSON file"""
    output = {
        "metadata": {
            "source": "outscraper google-maps-search",
            "scraped_at": datetime.now().isoformat(),
            "total": len(businesses)
        },
        "businesses": businesses
    }
    with open(out_file, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"Saved {len(businesses)} businesses to {out_file}")

if __name__ == "__main__":
    results = search_dry_cleaners("dry cleaner Ohio", limit=15)
    businesses = parse_results(results)
    save_businesses(businesses, OUT_FILE)
    print("Done!")