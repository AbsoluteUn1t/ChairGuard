#!/usr/bin/env python3
"""
Send queued cold emails from dublin-drycleaner-emails.json
Run manually or triggered by cron on Monday 9 AM EST
"""
import json
import subprocess

AGENTMAIL_KEY = "am_us_fc459ecd0225b4ac46512dd2976beeac9cf16ba4bc6926fd821f6b2701406b88"
INBOX = "growyourmargins@agentmail.to"
DB_PATH = "/home/curtis/.openclaw/workspace/dublin-drycleaner-emails.json"

with open(DB_PATH) as f:
    data = json.load(f)

sent_emails = {e['email'] for e in data['emails'] if e.get('sent')}
blocked = {"info@soapcitylaundry.com"}  # SES blocked

unsent = [e for e in data['emails'] if not e.get('sent') and e['email'] not in blocked and e['email'] not in sent_emails]
seen = set()
unique = [e for e in unsent if e['email'] not in seen and not seen.add(e['email'])]

print(f"Sending {len(unique)} queued emails...")

success = 0
for email in unique:
    payload = {
        "from": {"address": INBOX, "name": "Jimmy Growth Engine"},
        "to": [email['email']],
        "subject": email['subject'],
        "body": email['body']
    }
    
    result = subprocess.run([
        'curl', '-s', '-X', 'POST',
        f'https://api.agentmail.to/v0/inboxes/{INBOX}/messages/send',
        '-H', f'Authorization: Bearer {AGENTMAIL_KEY}',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps(payload)
    ], capture_output=True, text=True)
    
    resp = json.loads(result.stdout)
    msg_id = resp.get('message_id')
    
    if msg_id:
        print(f"  ✅ {email['business']} -> {email['email']}")
        email['sent'] = '2026-04-14'
        success += 1
    else:
        print(f"  ❌ {email['business']}: {resp}")

with open(DB_PATH, 'w') as f:
    json.dump(data, f, indent=2)

print(f"\nDone! Sent {success}/{len(unique)} emails.")