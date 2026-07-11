import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
import time

app = Flask(__name__)

# Simple in-memory cache
cache = {
    'data': None,
    'timestamp': 0
}
CACHE_DURATION = 600  # 10 minutes

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    # The atom namespace is http://www.w3.org/2005/Atom
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        entry_id = entry.find('atom:id', ns)
        updated = entry.find('atom:updated', ns)
        link = entry.find('atom:link', ns)
        content = entry.find('atom:content', ns)
        
        # Link attributes parsing
        link_href = ""
        if link is not None:
            link_href = link.attrib.get('href', '')
            
        entries.append({
            'title': title.text if title is not None else "",
            'id': entry_id.text if entry_id is not None else "",
            'updated': updated.text if updated is not None else "",
            'link': link_href,
            'content': content.text if content is not None else ""
        })
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('force', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or cache['data'] is None or (now - cache['timestamp']) > CACHE_DURATION:
        try:
            entries = fetch_and_parse_feed()
            cache['data'] = entries
            cache['timestamp'] = now
            return jsonify({'success': True, 'entries': entries})
        except Exception as e:
            # If fetch fails but we have cached data, return the cached data with a warning
            if cache['data'] is not None:
                return jsonify({
                    'success': True, 
                    'entries': cache['data'], 
                    'warning': f"Failed to refresh feed: {str(e)}. Displaying cached data."
                })
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return jsonify({'success': True, 'entries': cache['data']})

if __name__ == '__main__':
    # Running on port 5001 to avoid conflicts with macOS AirPlay (port 5000)
    app.run(debug=True, port=5001)
