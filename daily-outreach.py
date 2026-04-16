#!/usr/bin/env python3
"""
Ohio Dry Cleaner Daily Outreach Pipeline
Self-improving campaign manager - runs daily via cron
"""
import json
import os
import sys
import requests
import time
from datetime import datetime

AGENTMAIL_KEY = "am_us_inbox_6ccccca2c1e58525dc743ffae54fd7c9fb400fbbe31da502daabd4e297bc0661"
OUTSCAPER_KEY = os.getenv("OUTSCRAPER_API_KEY", "NWU1OTE4MzIzOTA5NGMzODgwNjgzOTkzMGNiY2Q4NTZ8OGRiYzZkMDc2Mw")
INBOX_ID = "growyourmargins%40agentmail.to"  # URL-encoded for GET
INBOX_ID_RAW = "growyourmargins@agentmail.to"

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
    for f in ["dublin-drycleaner-emails.json", "ohio-drycleaners-new.json", 
              "ohio-drycleaners-batch2.json", "filtered-leads.json"]:
        try:
            with open(f) as fp:
                data = json.load(fp)
                businesses = data.get("businesses", []) or data.get("leads", [])
                for biz in businesses:
                    if biz.get("email"):
                        emails.add(biz["email"].lower())
                    # Also check website-based contacts
                    if biz.get("website"):
                        emails.add(biz["website"].lower())
        except:
            pass
    return emails

def get_outscraper_leads(query="dry cleaner Ohio", limit=15):
    """Fetch new leads from Outscraper"""
    url = "https://api.outscraper.com/google-maps-search"
    headers = {"X-API-KEY": OUTSCAPER_KEY, "Content-Type": "application/json"}
    payload = {"query": query, "limit": limit}
    
    print(f"[Outscraper] Fetching: {query}")
    r = requests.post(url, headers=headers, json=payload)
    r.raise_for_status()
    result = r.json()
    request_id = result["id"]
    
    # Poll until ready
    for i in range(30):
        time.sleep(2)
        check = requests.get(f"https://api.outscraper.cloud/requests/{request_id}", headers=headers)
        data = check.json()
        if data.get("status") == "Success":
            print(f"[Outscraper] Done - got {len(data['data'][0])} businesses")
            return data["data"][0]
        print(f"[Outscraper] Waiting... status={data.get('status')}")
    return []

def filter_leads(businesses, blacklist, emailed, min_reviews=30):
    """Filter leads that are worth contacting"""
    filtered = []
    for b in businesses:
        # Skip if no website (can't validate email)
        if not b.get("website"):
            continue
        # Skip businesses with low reviews
        if b.get("reviews", 0) < min_reviews:
            continue
        # Skip already emailed (by website)
        website = b.get("website", "").lower()
        if website and website in emailed:
            continue
        filtered.append(b)
    return filtered

def generate_email(biz, version="A"):
    """Generate personalized outreach email"""
    name = biz.get("name", "there")
    city = biz.get("address", "").split(",")[-2].strip() if biz.get("address") else ""
    reviews = biz.get("reviews", 0)
    
    if version == "A":
        subject = f"Quick question about {name}"
        text = f"""Hi,

I noticed {name} in {city} — congrats on your {reviews}+ reviews!

I'm working with dry cleaners across Ohio to help them get more customers through their website and Google presence. We've helped shops increase bookings by 20-30%.

Do you have 5 minutes this week for a quick call? No pitch, just sharing what's working for others in your area.

Thanks,
Marcus
"""
    else:
        subject = f"{name} in {city} - free analysis"
        text = f"""Hi,

I came across {name} and noticed you have great reviews ({reviews}+). Most dry cleaners we talk to are leaving money on the table with their current marketing.

We do free website and SEO analysis for businesses like yours — no cost, no obligation. Would you be interested in seeing what's working for similar shops in Ohio?

Best,
Marcus
"""
    return {"subject": subject, "text": text}

def analyze_agentmail_inbox():
    """Check inbox for bounces and responses"""
    url = f"https://api.agentmail.to/v0/inboxes/{INBOX_ID}/messages?limit=100"
    headers = {"Authorization": f"Bearer {AGENTMAIL_KEY}"}
    
    try:
        r = requests.get(url, headers=headers)
        data = r.json()
        messages = data.get("messages", [])
        
        bounced = [m for m in messages if "bounced" in m.get("labels", [])]
        sent = [m for m in messages if "sent" in m.get("labels", []) and "bounced" not in m.get("labels", [])]
        responses = [m for m in messages if "received" in m.get("labels", []) and not m.get("from", "").startswith("mailer")]
        
        return {
            "total": len(messages),
            "bounced": len(bounced),
            "sent": len(sent),
            "responses": len(responses),
            "bounce_rate": f"{len(bounced)/(len(messages)+0.001)*100:.1f}%",
            "response_rate": f"{len(responses)/(len(sent)+0.001)*100:.1f}%"
        }
    except Exception as e:
        return {"error": str(e)}

def send_via_agentmail(to_email, subject, text):
    """Send email through AgentMail API"""
    url = f"https://api.agentmail.to/v0/inboxes/{INBOX_ID_RAW}/messages/send"
    headers = {
        "Authorization": f"Bearer {AGENTMAIL_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "to": [to_email],
        "subject": subject,
        "text": text
    }
    
    try:
        r = requests.post(url, headers=headers, json=payload)
        if r.status_code == 200:
            return {"success": True, "message_id": r.json().get("message_id")}
        else:
            return {"success": False, "error": r.text}
    except Exception as e:
        return {"success": False, "error": str(e)}

def run_campaign(max_emails=10):
    """Execute daily campaign"""
    print("=" * 60)
    print("OHIO DRY CLEANER CAMPAIGN - Self-Improving Daily Pipeline")
    print("=" * 60)
    
    # 1. Analyze inbox
    print("\n[1] Analyzing inbox...")
    stats = analyze_agentmail_inbox()
    print(f"    Inbox: {stats.get('total', '?')} messages, {stats.get('bounced', '?')} bounced, {stats.get('responses', '?')} responses")
    print(f"    Rates: bounce={stats.get('bounce_rate','?')}, response={stats.get('response_rate','?')}")
    
    # 2. Load filters
    blacklist = load_blacklist()
    emailed = load_previously_emailed()
    print(f"\n[2] Filters loaded: {len(blacklist)} blacklisted, {len(emailed)} previously emailed")
    
    # 3. Get fresh leads
    print("\n[3] Fetching fresh leads from Outscraper...")
    leads = get_outscraper_leads("dry cleaner Columbus Ohio", limit=15)
    
    # 4. Filter
    print("\n[4] Filtering leads...")
    filtered = filter_leads(leads, blacklist, emailed, min_reviews=30)
    print(f"    {len(filtered)} qualified leads after review threshold (min 30 reviews)")
    
    # 5. Save to campaign queue
    with open("campaign-queue.json", "w") as f:
        json.dump({"saved_at": datetime.now().isoformat(), "queue": filtered[:max_emails]}, f, indent=2)
    print(f"    Saved {len(filtered[:max_emails])} to campaign-queue.json")
    
    # 6. Display email drafts (ready for sending when API works)
    print("\n[5] Top email drafts ready:")
    for i, lead in enumerate(filtered[:5]):
        email = generate_email(lead, "A")
        print(f"\n    [{i+1}] {lead['name']}")
        print(f"        To: {lead.get('email', 'need-email')}")
        print(f"        Subject: {email['subject']}")
    
    print("\n[DONE] Campaign queued. Ready to send when AgentMail API recovers.")
    return filtered[:max_emails]

if __name__ == "__main__":
    run_campaign()