#!/bin/bash
# Daily Dublin OH Dry Cleaner Email Outreach Pipeline
# Runs every day at 1PM EST
# Goal: Find 10+ emails, draft personalized cold emails, save to workspace

WORKSPACE="/home/curtis/.openclaw/workspace"
LOG="$WORKSPACE/logs/daily-outreach-$(date +%Y%m%d).log"
EMAILDB="$WORKSPACE/dublin-drycleaners.json"
DRAFTDB="$WORKSPACE/dublin-drycleaner-emails.json"
DATE=$(date +%Y-%m-%d)

mkdir -p "$WORKSPACE/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}

log "=== Starting Daily Outreach Pipeline ==="

# Check Ollama
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    log "ERROR: Ollama not running"
    exit 1
fi

log "Ollama running. Starting pipeline..."

# Step 1: Fetch fresh dry cleaner listings from BBB
log "Step 1: Fetching BBB listings for Dublin OH area..."
BBB_HTML=$(curl -sL "https://www.bbb.org/us/oh/dublin/category/dry-cleaners" \
    -A "Mozilla/5.0" --max-time 20 2>>"$LOG")

if [ -z "$BBB_HTML" ]; then
    log "WARNING: BBB fetch returned empty, using cached listings"
fi

# Step 2: Use Mistral Nemo via Ollama to research and find emails
log "Step 2: Running research agent (Mistral Nemo) to find 10+ emails..."

RESEARCH_PROMPT="You are an expert at finding business contact emails. Your task: find contact emails for 10 dry cleaning businesses in the Dublin OH area (zip codes: 43016, 43017, 43074, 43082, 43123, 43206, 43207, 43228, 43764, 44857, 45424, 45429, 45828).

For each business you find:
1. Search the web for the business name + 'contact email' or 'email'
2. Check their website if you can find it
3. Try to find their actual contact email (not a form, not info@ if a specific contact exists)

Known businesses in this area (use these as a starting point, find 10 total):
- Lamb's Dry Cleaners (New Lexington, OH 43764) - owner Susan Saffell - website: lambslaundry.com
- Soap City Laundry (Columbus OH 43207) - website: soapcitylaundry.com  
- The Columbus Lace Cleaning Company (Columbus OH 43206) - website: columbuslace.com
- Quality Dry Cleaners (Kettering OH 45429) - website: qualitydrycleaners.com
- Eastwood Laundry Center (Dayton OH 45424)
- Executive Cleaners (Norwalk OH 44857) - website: executivecleaners.com
- Economy Linen & Towel Service (Columbus OH 43228)
- The Mr. Shoppe (Coldwater OH 45828) - owner Stephanie Hibner - website: themrshoppe.com
- Plaza Cleaners (Dublin OH 43017)
- Crown Cleaners (Columbus OH)
- Handy Cleaners (Dublin OH)
- Five Star Cleaners (Powell OH)
- Bellview Cleaners
- Action Cleaners

Return ONLY valid JSON with exactly this format (no markdown, no explanation):
{
  \"date\": \"$DATE\",
  \"found\": [
    {\"business\": \"Name\", \"email\": \"found@email.com or null\", \"phone\": \"xxx-xxx-xxxx\", \"zip\": \"xxxxx\", \"website\": \"url or null\", \"owner\": \"name or null\", \"source\": \"how you found it\"}
  ]
}
Find real emails. Aim for at least 10. Do NOT make up emails."

RESEARCH_RESULT=$(curl -s -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"mistral-nemo:12b\", \"prompt\": $(echo "$RESEARCH_PROMPT" | jq -Rs .), \"stream\": false}" 2>>"$LOG")

echo "$RESEARCH_RESULT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    text = d.get('response', '')
    start = text.find('{')
    end = text.rfind('}') + 1
    if start >= 0 and end > start:
        data = json.loads(text[start:end])
        print(json.dumps(data))
    else:
        print('ERROR: No JSON found in response')
except Exception as e:
    print(f'ERROR: {e}')
    print(text[:500] if 'text' in dir() else 'no text')
" >> "$LOG" 2>&1

RESEARCH_JSON=$(echo "$RESEARCH_RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
text = d.get('response', '')
start = text.find('{')
end = text.rfind('}') + 1
if start >= 0 and end > start:
    print(text[start:end])
" 2>/dev/null)

if [ -z "$RESEARCH_JSON" ] || [ "$RESEARCH_JSON" = "ERROR: No JSON found in response" ]; then
    log "ERROR: Research agent returned no valid JSON"
    exit 1
fi

FOUND_COUNT=$(echo "$RESEARCH_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('found',[])))" 2>/dev/null)
log "Research found $FOUND_COUNT businesses"

# Step 3: Use Mistral Nemo to draft personalized cold emails
log "Step 3: Drafting cold emails for found businesses..."

DRAFT_PROMPT="You are a professional cold email copywriter. Given a list of dry cleaning businesses with contact info, write ONE personalized cold email for EACH business.

Service being offered: 'Growth Engine for Local Service Businesses' — AI-powered local growth automation covering lead generation, review management, competitor tracking, and customer outreach for small dry cleaning businesses.

For each business:
- Reference their specific name, area, or zip code in the email body
- Keep email 60-90 words
- Conversational, not spammy
- Include a low-friction CTA asking if they'd like a FREE local market analysis for their area
- Subject line: 5-7 words, no ALL CAPS, no spam words

Return ONLY valid JSON:
{
  \"date\": \"$DATE\",
  \"emails\": [
    {\"business\": \"Name\", \"email\": \"recipient@email.com\", \"subject\": \"Subject Line\", \"body\": \"Email body text...\"}
  ]
}

Businesses to email (use the actual emails found, not placeholder patterns):
$RESEARCH_JSON

Write one email per business that has a real email. Return all of them."

DRAFT_RESULT=$(curl -s -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"mistral-nemo:12b\", \"prompt\": $(echo "$DRAFT_PROMPT" | jq -Rs .), \"stream\": false}" 2>>"$LOG")

DRAFT_JSON=$(echo "$DRAFT_RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
text = d.get('response', '')
start = text.find('{')
end = text.rfind('}') + 1
if start >= 0 and end > start:
    print(text[start:end])
" 2>/dev/null)

if [ -z "$DRAFT_JSON" ]; then
    log "ERROR: Draft agent returned no valid JSON"
    exit 1
fi

EMAIL_COUNT=$(echo "$DRAFT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('emails',[])))" 2>/dev/null)
log "Drafted $EMAIL_COUNT emails"

# Step 4: Save to workspace
log "Step 4: Saving results..."

# Merge with existing data
python3 << PYEOF >> "$LOG" 2>&1
import json, sys

date = "$DATE"

# Load existing data
try:
    with open("$EMAILDB") as f:
        emaildb = json.load(f)
except:
    emaildb = {"businesses": [], "last_updated": ""}

try:
    with open("$DRAFTDB") as f:
        draftdb = json.load(f)
except:
    draftdb = {"generated_at": "", "service": "Blue Collar Growth Engine", "email_count": 0, "emails": []}

# Parse new data
try:
    new_businesses = json.loads("""$RESEARCH_JSON""")
    new_emails = json.loads("""$DRAFT_JSON""")
    
    # Update email database
    existing_names = {b.get('name') for b in emaildb.get('businesses', [])}
    for biz in new_businesses.get('found', []):
        if biz.get('name') and biz.get('name') not in existing_names:
            emaildb.setdefault('businesses', []).append(biz)
    emaildb['last_updated'] = date
    
    # Update draft database  
    if date != draftdb.get('generated_at', '').split('T')[0]:
        draftdb['emails'] = []  # Reset if new day
    
    for email in new_emails.get('emails', []):
        # Check not duplicate
        if not any(e.get('business') == email.get('business') and e.get('date','') == date for e in draftdb['emails']):
            email['date'] = date
            draftdb['emails'].append(email)
    
    draftdb['generated_at'] = f"{date}T13:00:00Z"
    draftdb['email_count'] = len(draftdb['emails'])
    
    with open("$EMAILDB", 'w') as f:
        json.dump(emaildb, f, indent=2)
    with open("$DRAFTDB", 'w') as f:
        json.dump(draftdb, f, indent=2)
    
    print(f"SAVED: {len(new_businesses.get('found',[]))} businesses, {len(new_emails.get('emails',[]))} emails")
    
    # Summary
    confirmed = [e for e in draftdb['emails'] if e.get('email') and '@' in e.get('email','')]
    needs_email = [e for e in draftdb['emails'] if not e.get('email') or '@' not in e.get('email','')]
    print(f"TOTAL: {len(draftdb['emails'])} emails | {len(confirmed)} ready to send | {len(needs_email)} need email")
    
except Exception as e:
    print(f"ERROR saving: {e}")
    import traceback; traceback.print_exc()
PYEOF

log "Pipeline complete. Check $EMAILDB and $DRAFTDB for results."
echo "---" >> "$LOG"
