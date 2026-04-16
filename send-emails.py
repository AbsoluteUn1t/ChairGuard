#!/usr/bin/env python3
"""Send cold emails via AgentMail API v0"""
import subprocess, json

API_KEY = "am_us_fc459ecd0225b4ac46512dd2976beeac9cf16ba4bc6926fd821f6b2701406b88"
FROM_INBOX = "growyourmargins@agentmail.to"
SEND_URL = f"https://api.agentmail.to/v0/inboxes/{FROM_INBOX}/messages"

emails = [
    {
        "business": "Metropolitan Cleaners",
        "to": "70mainmet@gmail.com",
        "subject": "Free local market report for Metropolitan Cleaners",
        "body": "Hi Metropolitan Cleaners team,\n\nI came across your Dayton-area business and wanted to share something useful: a free local market analysis for dry cleaners in your zip code — covering competitor pricing, review patterns, and local search visibility.\n\nWe've built an AI growth engine that helps small service businesses compete with bigger chains. Would love to show you what's working in your neighborhood.\n\nOpen to a quick chat?"
    },
    {
        "business": "Sunbury Cleaners",
        "to": "info@sunburycleaners.com",
        "subject": "Boost your local Sunbury presence",
        "body": "Hi Sunbury team,\n\nDublin's dry cleaner market is getting more competitive — and I wanted to reach out because we help local shops like yours capture more of the neighborhood market.\n\nThink of it as having a digital marketing assistant who tracks your competitors, manages your reviews, and keeps your local search presence sharp — all automated.\n\nWould you be open to a 15-minute call to walk through a free market report for the 43082 area?"
    },
    {
        "business": "Soap City Laundry",
        "to": "info@soapcitylaundry.com",
        "subject": "Grow your Columbus reach",
        "body": "Hi there,\n\nSaw you're operating in the 43207 area. We boost local businesses with AI-powered growth tools — competitor tracking, review management, and lead generation.\n\nHow about a FREE local market analysis for your area? No catch, just useful info about what's working in your neighborhood.\n\nInterested?"
    },
    {
        "business": "Lamb's Dry Cleaners",
        "to": "info@lambsdrycleaners.com",
        "subject": "New Lex OH Market Insights",
        "body": "Hi Lambs team,\n\nNoticed you're operating in the 43764 area — love what local businesses like yours bring to the community.\n\nWe help dry cleaners automate their local growth: competitor tracking, review management, and lead generation. Thought you might want a free market analysis for the New Lexington area?\n\nOpen to a quick chat?"
    },
    {
        "business": "Executive Cleaners",
        "to": "info@executivecleaners.com",
        "subject": "Elevate your 44857 business",
        "body": "Hi Executive Cleaners team,\n\nWe spotted you in the 44857 area and thought you'd be a great fit for something we've built: an AI-powered growth engine that helps local service businesses get more leads and manage their online reputation.\n\nWe'd love to show you a free local market analysis — what's working in your area, who's competing with you, and how to get ahead.\n\nOpen to it?"
    },
    {
        "business": "Calloway Cleaning & Restoration",
        "to": "info@callowaycleaning.com",
        "subject": "Energize your 45242 business growth",
        "body": "Hi Calloway team,\n\nWe noticed you're in the 45242 area and thought you'd appreciate a free local market analysis for dry cleaners in your neighborhood.\n\nOur AI growth engine helps small businesses compete with bigger chains by automating competitor tracking, review management, and customer outreach.\n\nWould love to show you what's happening in your market. Interested?"
    },
    {
        "business": "Lambs Dry Cleaners",
        "to": "info@lambslaundry.com",
        "subject": "New Lex OH Market Insights",
        "body": "Hi Lambs team,\n\nJust wanted to reach out — we help local dry cleaners in Ohio automate their growth. Competitor tracking, review management, and lead generation, all in one AI-powered engine.\n\nWould you be open to a free local market analysis for the 43764 area? No catch, just useful info.\n\nLet me know!"
    },
    {
        "business": "Columbus Lace Cleaning",
        "to": "columbuslace@aol.com",
        "subject": "Columbus Leads Boost",
        "body": "Hi Columbus Lace team,\n\nLet's talk about boosting leads in your area. We help local dry cleaners automate their growth with AI — competitor tracking, review management, and outreach.\n\nHow about a free local market analysis for the 43206 area? Just want to show you what's working in your neighborhood.\n\nOpen to a quick chat?"
    },
    {
        "business": "Quality Dry Cleaners",
        "to": "qualitydrycleanersdayton@gmail.com",
        "subject": "Dayton OH Growth Strategy",
        "body": "Hi Quality Dry Cleaners team,\n\nLet's grow your Dayton business. We help local dry cleaners compete with bigger chains using AI-powered growth automation.\n\nHow about a free market analysis for the 45429 area? We'll show you competitor pricing, review patterns, and local search opportunities.\n\nInterested in a quick chat?"
    },
    {
        "business": "Eastwood Laundry Center",
        "to": "eastwoodlaundry@msn.com",
        "subject": "Dayton OH Local Growth Plan",
        "body": "Hi Eastwood team,\n\nLet's chat about growing your local business. We built an AI growth engine specifically for local service businesses like yours — covering lead generation, review management, and competitor tracking.\n\nWould love to show you a free market analysis for the 45424 area. Just want to show you what's working in your neighborhood.\n\nOpen to a quick call?"
    },
    {
        "business": "Economy Linen",
        "to": "economylinen@gmail.com",
        "subject": "Columbus OH Local Growth Plan",
        "body": "Hi Economy Linen team,\n\nLet's talk about growing your Columbus business. We help local service businesses automate their growth with AI — lead generation, competitor tracking, and review management.\n\nHow about a free market analysis for the 43228 area? No catch, just useful info about your local market.\n\nInterested in a quick chat?"
    },
    {
        "business": "The Mr. Shoppe",
        "to": "mrshoppe@yahoo.com",
        "subject": "Free local market analysis for The Mr. Shoppe",
        "body": "Hi Mr. Shoppe team,\n\nLove what you do for the Coldwater community. We help local service businesses like yours compete more effectively with AI-powered growth tools.\n\nWould you be open to a free local market analysis for the 45828 area? We'll show you competitor pricing, review patterns, and local search visibility.\n\nNo catch — just useful info. Interested?"
    }
]

sent = 0
for email in emails:
    payload = json.dumps({
        "to": [email["to"]],
        "subject": email["subject"],
        "text": email["body"]
    })
    r = subprocess.run(
        ['curl', '-s', '-X', 'POST', SEND_URL,
         '-H', f'Authorization: Bearer {API_KEY}',
         '-H', 'Content-Type: application/json',
         '-d', payload],
        capture_output=True, text=True, timeout=15
    )
    try:
        resp = json.loads(r.stdout)
        if 'message_id' in resp:
            print(f"✓ {email['business']} -> {email['to']}")
            sent += 1
        else:
            print(f"✗ {email['business']} -> {email['to']} [{resp.get('error',{}).get('message','error')}]")
    except:
        print(f"✗ {email['business']} -> {email['to']} [PARSE ERROR: {r.stdout[:80]}]")

print(f"\n{sent}/{len(emails)} sent successfully")
