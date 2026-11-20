# CPIT-405 Lab 7 — Fieldnotes

A responsive Unsplash photo search page demonstrating three asynchronous JavaScript approaches:

- `XMLHttpRequest` with load and error events
- `fetch()` with Promises and `.then()` / `.catch()`
- `fetch()` with `async` / `await`

It also creates result cards with the DOM API, handles mouse clicks for the controls, and explicitly handles the Enter key in the search field.

## Run it

1. Create an application and copy its Access Key from [Unsplash Developers](https://unsplash.com/developers).
2. Open `index.html` in a browser (or serve this folder with any static web server).
3. Open **API key**, paste the Access Key, and choose **Save on this device**.
4. Enter a search phrase. Change the request method to compare the three implementations.

The key is saved in this browser's local storage. It is not part of the source code. Unsplash may require the app to be configured for the API's current access and rate limits.

