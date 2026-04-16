#!/usr/bin/env python3
"""
Ohio Dry Cleaner Outreach - Self-Improving Campaign Manager
Analyzes results, blacklists bounces, and improves future outreach
"""
import json
import os
from datetime import datetime

AGENTMAIL_KEY = "am_us_inbox_6ccccca2c1e58525dc743ffae54fd7c9fb400fbbe31da502daabd4e297bc0661"
OUTSCAPER_KEY = os.getenv("OUTSCRAPER_API_KEY", "NWU1OTE4MzIzOTA5NGMzODgwNjgzOTkzMGNiY2Q4NTZ8OGRiYzZkMDc2Mw")

def load_blacklist():
    try:
        with open("email-blacklist.json") as f:
            data = json.load(f)
            return set(data.get("blacklist", []))
    except:
        return set()

def load_previously_emailed():
    """Get all emails we've already attempted"""
    emails = set()
    for f in ["dublin-drycleaner-emails.json", "ohio-drycleaners-new.json"]:
        try:
            with open(f) as fp:
                data = json.load(fp)
                for biz in data.get("businesses", []):
                    if biz.get("email"):
                        emails.add(biz["email"].lower())
        except:
            pass
    return emails

def get_fresh_leads(query="dry cleaner Ohio", limit=15):
    """Fetch new leads from Outscraper"""
    import requests
    url = "https://api.outscraper.com/google-maps-search"
    headers = {"X-API-KEY": OUTSCAPER_KEY, "Content-Type": "application/json"}
    payload = {"query": query, "limit": limit}
    
    print(f"Fetching leads: {query}")
    r = requests.post(url, headers=headers, json=payload)
    r.raise_for_status()
    result = r.json()
    request_id = result["id"]
    
    # Poll until ready
    import time
    for _ in range(30):
        time.sleep(2)
        check = requests.get(f"https://api.outscraper.cloud/requests/{request_id}", headers=headers)
        data = check.json()
        if data.get("status") == "Success":
            return data["data"][0]
    return []

def filter_leads(businesses, blacklist, emailed, min_reviews=20):
    """Filter leads that are worth contacting"""
    filtered = []
    for b in businesses:
        # Skip if no website (can't validate email)
        if not b.get("website"):
            continue
        # Skip businesses with low reviews (not established)
        if b.get("reviews", 0) < min_reviews:
            continue
        # Skip already emailed
        email = b.get("email", "").lower()
        if email and email in emailed:
            continue
        filtered.append(b)
    return filtered

def generate_personalized_email(biz, version="A"):
    """Generate personalized outreach email"""
    name = biz.get("name", "there")
    city = biz.get("address", "").split(",")[-2].strip() if biz.get("address") else ""
    website = biz.get("website", "")
    reviews = biz.get("reviews", 0)
    
    if version == "A":
        subject = f"Quick question about {name}"
        text = f"""Hi,

I noticed {name} in {city} — congrats on your {reviews}+ reviews!

I'm working with dry cleaners across Ohio to help them get more customers through their website and Google presence. We've helped shops like yours increase bookings by 20-30%.

Do you have 5 minutes this week for a quick call? No pitch, just sharing what's working for others in your area.

Thanks,
Marcus
"""
    else:  # Version B
        subject = f"{name} in {city} - free analysis"
        text = f"""Hi,

I came across {name} and noticed you have great reviews ({reviews}+). Most dry cleaners we talk to are leaving money on the table with their current marketing.

We do free website and SEO analysis for businesses like yours — no cost, no obligation. Would you be interested in seeing what's working for similar shops in Ohio?

Happy to share examples from competitors if helpful.

Best,
Marcus
"""
    return {"subject": subject, "text": text}

def run_campaign():
    """Main campaign execution"""
    blacklist = load_blacklist()
    emailed = load_previously_emailed()
    
    print("=" * 50)
    print("OHIO DRY CLEANER CAMPAIGN - Self-Improving v2")
    print("=" * 50)
    print(f"Blacklisted emails: {len(blacklist)}")
    print(f"Previously emailed: {len(emailed)}")
    
    # Get fresh leads
    leads = get_fresh_leads("dry cleaner Ohio", limit=15)
    print(f"Fresh leads: {len(leads)}")
    
    # Filter
    filtered = filter_leads(leads, blacklist, emailed)
    print(f"After filtering (min 20 reviews, no website skip): {len(filtered)}")
    
    # Save filtered leads for next campaign
    with open("filtered-leads.json", "w") as f:
        json.dump({"saved_at": datetime.now().isoformat(), "leads": filtered}, f, indent=2)
    
    print(f"\nSaved {len(filtered)} qualified leads to filtered-leads.json")
    print("\nTop leads:")
    for lead in filtered[:5]:
        print(f"  - {lead['name']} ({lead.get('reviews', 0)} reviews)")
    
    # Generate email drafts
    print("\n=== SAMPLE EMAIL DRAFTS ===")
    for lead in filtered[:2]:
        for v in ["A", "B"]:
            email = generate_personalized_email(lead, v)
            print(f"\nVersion {v} for {lead['name']}:")
            print(f"  Subject: {email['subject']}")
            print(f"  Body: {email['text'][:150]}...")

if __name__ == "__main__":
    run_campaign()