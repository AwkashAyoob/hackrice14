/* global google gapi */

let tokenClient;
let accessToken = null;
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

// Function to load and initialize Google API client
export const loadGoogleCalendar = () => {
  return new Promise((resolve, reject) => {
    console.log('Loading Google Calendar...');

    // Initialize the token client
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          console.error('Error during authentication:', response);
          reject(response);
        } else {
          console.log('Successfully authenticated, response:', response);
          accessToken = response.access_token;

          // Load the client library before using gapi.client
          gapi.load('client', {
            callback: () => {
              console.log('gapi.client loaded.');

              // Initialize gapi client with API key
              gapi.client.setApiKey(API_KEY);

              // **Set the access token in gapi.client**
              gapi.client.setToken({ access_token: accessToken });

              // Log before attempting to load the Google Calendar API
              console.log('Attempting to load Google Calendar API via discovery document...');

              // Proceed to load the Calendar API
              gapi.client.load("https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest")
                .then(() => {
                  console.log('Google Calendar API loaded successfully using discovery document.');
                  resolve();
                })
                .catch(error => {
                  console.error('Error loading Google Calendar API via discovery document:', error);

                  // Fallback to direct API loading if discovery document fails
                  console.log('Falling back to direct API loading...');
                  gapi.client.load('calendar', 'v3', () => {
                    console.log('Google Calendar API loaded using direct method.');
                    resolve();
                  }, (err) => {
                    console.error('Error loading Google Calendar API using direct method:', err);
                    reject(err);
                  });
                });
            },
            onerror: () => {
              console.error('gapi.client failed to load.');
              reject('gapi.client failed to load.');
            },
            timeout: 5000, // 5 seconds.
            ontimeout: () => {
              console.error('gapi.client could not load in a timely manner.');
              reject('gapi.client timed out.');
            }
          });
        }
      }
    });

    // Request user authorization and access token
    console.log('Requesting access token...');
    tokenClient.requestAccessToken();
  });
};

// Function to fetch Google Calendar events
export const fetchCalendarEvents = () => {
  console.log('Fetching calendar events...');
  if (gapi.client && gapi.client.calendar) {
    return gapi.client.calendar.events.list({
      'calendarId': 'primary',
      'timeMin': (new Date()).toISOString(),
      'showDeleted': false,
      'singleEvents': true,
      'orderBy': 'startTime'
    })
    .then(response => {
      console.log('Calendar events fetched successfully:', response.result.items);
      return response.result.items;
    })
    .catch(error => {
      console.error("Error fetching calendar events:", error);
      return [];
    });
  } else {
    console.error("gapi.client.calendar is undefined");
    return Promise.reject("Google API client is not initialized.");
  }
};

// Function to add an event to Google Calendar
export const addEventToCalendar = (event) => {
  console.log('Adding event to calendar...', event);
  if (gapi.client && gapi.client.calendar) {
    return gapi.client.calendar.events.insert({
      'calendarId': 'primary',
      'resource': event
    })
    .then(response => {
      console.log('Event added successfully:', response.result);
      return response.result;
    })
    .catch(error => {
      console.error("Error adding event to calendar:", error);
      return Promise.reject(error);
    });
  } else {
    console.error("gapi.client.calendar is undefined");
    return Promise.reject("Google API client is not initialized.");
  }
};