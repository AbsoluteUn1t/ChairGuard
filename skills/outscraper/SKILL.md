# Outscraper Skill

Scrape Google Maps for local businesses using Outscraper API.

## Setup
API key stored in `openclaw.json` under `skills.entries.outscraper.env.OUTSCRAPER_API_KEY`

## API Endpoints

**Google Maps Search** (async, ~5-10s to complete):
```
GET https://api.outscraper.cloud/google-maps-search?query=<query>&limit=<N>&format=json
Authorization: Bearer <OUTSCRAPER_API_KEY>
```

**Poll for Results**:
```
GET https://api.outscraper.cloud/tasks/<ui_task_id>
Authorization: Bearer <OUTSCRAPER_API_KEY>
```

**Download** (via `file_url` from task result):
```
GET <file_url>
```

## Usage

```python
import subprocess, json, time

def search_google_maps(query, limit=20):
    key = "YOUR_API_KEY"
    # Submit job
    result = subprocess.run([
        'curl', '-s', f"https://api.outscraper.cloud/google-maps-search?query={query}&limit={limit}&format=json",
        '-H', f'Authorization: Bearer {key}'
    ], capture_output=True, text=True)
    task_id = json.loads(result.stdout).get('ui_task_id')
    
    # Poll
    for _ in range(10):
        time.sleep(5)
        result = subprocess.run([
            'curl', '-s', f'https://api.outscraper.cloud/tasks/{task_id}',
            '-H', f'Authorization: Bearer {key}'
        ], capture_output=True, text=True)
        status = json.loads(result.stdout).get('status')
        if status == 'SUCCESS':
            file_url = json.loads(result.stdout)['results'][0]['file_url']
            break
    
    # Download results
    result = subprocess.run(['curl', '-s', file_url], capture_output=True, text=True)
    return json.loads(result.stdout)
```

## Parameters
- `query`: Search query (e.g., "dry cleaners Dublin OH")
- `limit`: Max results (default 10)
- `format`: json | xlsx | csv | parquet

## Notes
- Task completes in ~5-10 seconds
- Results expire eventually — download immediately
- Dublin CA sometimes appears for "Dublin OH" queries — filter by state "OH"
