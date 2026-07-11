# BigQuery Release Notes Explorer

A modern, responsive Flask web application that aggregates, parses, searches, and shares release updates from the official Google BigQuery release notes Atom feed.

---

## 🚀 Features

* **Real-time Atom Feed Parsing**: Automatically fetches and parses Google's BigQuery release notes Atom feed.
* **Granular Search**: Full-text client-side searching across all updates.
* **Category Filters**: Categorize updates by type (*Features*, *Changes*, *Deprecations*).
* **In-memory Cache**: Keeps the backend lightweight and fast by caching feed results for 10 minutes.
* **X/Twitter Sharing**: Direct integration to share updates with an accurate X character-limit composer.
* **Premium Design**: Responsive dark theme UI built using glassmorphism styling and custom typography.

---

## 🛠️ Tech Stack

* **Backend**: Python, Flask, `xml.etree.ElementTree` (Standard Library)
* **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphism), Vanilla JavaScript ES6

---

## 🚀 Getting Started

### Prerequisites

* Python 3.8 or higher
* `pip` (Python package installer)

### Installation & Run

1. Navigate to the project directory:
   ```bash
   cd "Learning /AI/5-Day AI course from google on vibe coding/agy2-projects/my-first-project"
   ```
2. Install Flask:
   ```bash
   pip install Flask
   ```
3. Run the development server:
   ```bash
   python app.py
   ```
4. Open your browser and navigate to:
   [http://127.0.0.1:5001/](http://127.0.0.1:5001/)
   *(Note: Runs on port `5001` to avoid conflict with macOS AirPlay).*
