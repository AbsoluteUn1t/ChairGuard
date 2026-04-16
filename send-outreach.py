#!/usr/bin/env python3
"""
Dry Cleaner Cold Email Outreach
Sends personalized emails via AgentMail (growyourmargins@agentmail.to)
Tracks results for A/B testing self-improvement
"""
import os
import json
import requests
from datetime import datetime

AGENTMAIL_API_KEY = os.getenv("AGENTMAIL_API_KEY")
AGENTMAIL_INBOX = "growyourmargins@agentmail.to"
INBOX_ID = "growyourmargins"

def load_businesses(filepath):
    with open(filepath) as f:
        data = json.load(f)
    return data.get("businesses", [])

def load_previous_emails():
    """Load previously emailed businesses to avoid duplicates"""
    try:
        with open("dublin-drycleaner-emails.json") as f:
            existing = json.load(f)
            return {b.get("email") for b in existing if b.get("email")}
    except:
        return set()

def draft_email_v1(biz, idx):
    """Version A: Discount offer (10% off first order)"""
    name = biz.get("name", "there")
    city = biz.get("address", "").split(",")[-1].strip() if biz.get("address") else ""
    return {
        "to": [],
        "subject": f"10% off for {name} - Quick question",
        "text": f"""Hi there,

I hope you're doing well. I'm reaching out because we help dry cleaners across Ohio streamline their operations and grow revenue.

I noticed {name} in {city} and wanted to share something that might help:

We're offering 10% off our first month of service for a limited time. This includes:
- Automated customer reminders (reduces no-shows)
- Online booking integration
- Marketing tools to attract new customers

Would you be open to a quick 5-minute call this week to see if this could work for {name}?

Best,
Marcus
Grow Your Margins
""",
        "metadata": {"version": "A", "business": name, "batch": idx}
    }

def draft_email_v2(biz, idx):
    """Version B: Free pickup service offer"""
    name = biz.get("name", "there")
    city = biz.get("address", "").split(",")[-1].strip() if biz.get("address") else ""
    return {
        "to": [],
        "subject": f"Free pickup service for {name}",
        "text": f"""Hi there,

I hope you're doing well. I'm Marcus with Grow Your Margins.

I wanted to reach out because we help dry cleaners like {name} in {city} save time and grow their customer base.

One thing we offer: FREE pickup service integration for your first 3 months. No cost, no obligation.

Would you have 5 minutes this week for a quick call to see if this could benefit {name}?

Thanks,
Marcus
Grow Your Margins
""",
        "metadata": {"version": "B", "business": name, "batch": idx}
    }

def send_email_via_agentmail(to_email, subject, text, metadata=None):
    """Send email through AgentMail API"""
    url = "https://api.agentmail.to/v1/inboxes/send"
    headers = {
        "Authorization": f"Bearer {AGENTMAIL_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "inbox_id": INBOX_ID,
        "to": [to_email],
        "subject": subject,
        "text": text
    }
    if metadata:
        payload["metadata"] = metadata
    
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        result = response.json()
        return {"success": True, "message_id": result.get("id")}
    else:
        return {"success": False, "error": response.text}

def run_campaign(business_file, version="A", max_emails=10):
    """Run email campaign with specified version"""
    businesses = load_businesses(business_file)
    already_emailed = load_previous_emails()
    
    sent = 0
    bounced = 0
    results = []
    
    for idx, biz in enumerate(businesses):
        if sent >= max_emails:
            break
        
        email = biz.get("email")
        if not email or email in already_emailed:
            continue
        
        # Draft email
        if version == "A":
            email_body = draft_email_v1(biz, idx)
        else:
            email_body = draft_email_v2(biz, idx)
        
        # Send
        result = send_email_via_agentmail(email, email_body["subject"], email_body["text"], email_body.get("metadata"))
        
        if result.get("success"):
            sent += 1
            print(f"✅ Sent Version {version} to {biz['name']} ({email})")
        else:
            bounced += 1
            print(f"❌ Failed to send to {biz['name']}: {result.get('error')}")
        
        results.append({
            "business": biz["name"],
            "email": email,
            "version": version,
            "sent": result.get("success"),
            "timestamp": datetime.now().isoformat()
        })
        
        # Rate limit
        time.sleep(1)
    
    return {"sent": sent, "bounced": bounced, "results": results}

def save_results(campaign_results, version):
    """Save campaign results for analysis"""
    outfile = f"campaign-results-{version}-{datetime.now().strftime('%Y%m%d')}.json"
    with open(outfile, 'w') as f:
        json.dump(campaign_results, f, indent=2)
    return outfile

if __name__ == "__main__":
    import time
    
    version_a = run_campaign("ohio-drycleaners-new.json", version="A", max_emails=10)
    print(f"\nVersion A Results: {version_a['sent']} sent, {version_a['bounced']} bounced")
    save_results(version_a, "A")
    
    version_b = run_campaign("ohio-drycleaners-new.json", version="B", max_emails=10)
    print(f"Version B Results: {version_b['sent']} sent, {version_b['bounced']} bounced")
    save_results(version_b, "B")
    
    print("\n✅ Campaign complete! Check campaign-results-*.json for details.")