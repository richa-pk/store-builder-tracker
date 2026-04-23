# Store Builder Tracker Demo

A small local demo app for testing website activity tracking in a browser page.

## Project files

- `index.html` - A demo storefront page with product cards, links, buttons, and a simple customer form.
- `tracker.js` - A browser-side tracker script that captures click and form input events and posts them to a tracking endpoint.
- `server.js` - A minimal Node.js HTTP server that serves the demo page, accepts tracking POST requests at `/track`, and exposes recent events at `/events`.

## How it works

1. `index.html` loads `tracker.js` and sets `window.WEBSITE_ACTIVITY_APPS_SCRIPT_URL` to `http://localhost:8787/track`.
2. `tracker.js` captures:
   - click events on links and buttons
   - field changes on form inputs
3. Each captured event is enriched with page metadata and sent as JSON to the local `/track` endpoint.
4. `server.js` stores the most recent events in memory and exposes them at `/events`.

## Running the demo

1. Install Node.js if needed.
2. Open a terminal in this project folder.
3. Run:

```bash
node server.js
```

4. Open the browser to:

```text
http://localhost:8787/
```

5. Interact with the page by clicking buttons, product links, or changing form fields.
6. The page refreshes recent tracked events every second from the local receiver.

## Endpoints

- `GET /` - Serves `index.html`
- `GET /tracker.js` - Serves the tracker script
- `POST /track` - Receives tracker events
- `GET /events` - Returns the recent event payloads as JSON

## Notes

- This demo stores events only in memory and is intended for local testing.
- The tracker redacts sensitive data in fields containing "password", "credit", "card", "cvv", "cvc", "otp", "ssn".

```sh

```