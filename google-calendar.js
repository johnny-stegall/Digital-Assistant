"use strict";

const fs = require("fs");
const readlineSync = require("readline-sync");
const google = require("googleapis");
const googleAuth = require("google-auth-library");
const sleep = require("system-sleep");
const CalendarApi = require("./calendar-api");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const TIMEOUT = 30000;
const TOKEN_PATH = "google-credentials.json"; 

/****************************************************************************
* A class to query a Google calendar.
****************************************************************************/
class GoogleCalendar extends CalendarApi
{
  /**************************************************************************
  * Creates an instance of GoogleCalendar.
  *
  * @param {object} config Configuration settings.
  **************************************************************************/
  constructor(config)
  {
    super();
    this.config = config;
    this.isAuthenticated = false;
    this.oauth2Client = null;
  }

  /****************************************************************************
  * Creates an event.
  *
  * @param {date} dateTime The event date and time.
  * @param {integer} duration The event duration in minutes.
  * @param {string} title The event title.
  * @param {string} location The location.
  * @param {array} attendees The names of the attendees.
  ****************************************************************************/
  createEvent(dateTime, duration, title, location, attendees)
  {
    if (!this.isAuthenticated)
      authenticate.call(this);

    let calendar = google.calendar("v3");
    let endTime = new Date(dateTime.getTime() + (duration * 60000))
    let event =
    {
      "summary": title,
      "location": location || "TBD",
      "description": title,
      "start":
      {
        "dateTime": dateTime,
        "timeZone": "America/Los_Angeles",
      },
      "end":
      {
        "dateTime": endTime,
        "timeZone": "America/Los_Angeles",
      },
      "attendees": [],
    };

    if (attendees)
    {
      for (let attendeeIndex = 0; attendeeIndex < attendees.length; attendeeIndex++) 
        event.attendees.push({ "email": this.resolveEmail(attendees[attendeeIndex].entity) });
    }

    calendar.events.insert(
    {
      auth: this.oauth2Client,
      calendarId: "primary",
      resource: event
    },
    function(e)
    {
      if (e)
        console.log(`There was an error contacting the Calendar service: ${e}.`);
    });
  }

  /****************************************************************************
  * Deletes an event.
  *
  * @param {variant} event The event date and time or title.
  ****************************************************************************/
  deleteEvent(event)
  {
    if (!this.isAuthenticated)
      authenticate.call(this);

    let calendar = google.calendar("v3");
    return findEvent(calendar, this.oauth2Client, event)
      .then(existingEvent =>
      {
        if (existingEvent)
        {
          calendar.events.delete(
          {
            auth: this.oauth2Client,
            calendarId: "primary",
            eventId: existingEvent.id,
          },
          function (e)
          {
            if (e)
              console.log(`Failed to delete ${existingEvent.subject}: ${e}.`);
          });
        }
      });
  }

  /****************************************************************************
  * Determines if the calendar has an event at the specified date/time.
  *
  * @param {date} dateTime The date and time to check.
  * @param {integer} duration The duration in minutes.
  * @returns {boolean} True if the calendar is open, false otherwise.
  ****************************************************************************/
  isAvailable(startTime, duration)
  {
    if (!this.isAuthenticated)
      authenticate.call(this);

    if (startTime < new Date())
      return false;

    let calendar = google.calendar("v3");
    let endTime = new Date(startTime.getTime() + duration * 60000);
    const EIGHT_HOURS = 28800000;
    let startFilterDate = new Date(startTime.getTime() - EIGHT_HOURS);
    let endFilterDate = new Date(startTime.getTime() + EIGHT_HOURS);

    return getEvents(calendar, this.oauth2Client, startFilterDate, endFilterDate)
      .then(function(events)
      {
        if (events && events.length)
        {
          let conflictingEvent = events.find(event =>
          {
            let eventStart = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date);
            let eventEnd = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date);

            if (eventStart.valueOf() == startTime.valueOf())
              return true;
            else if (eventStart > startTime && eventStart < eventEnd)
              return true;
            else if (eventEnd > startTime && eventEnd < endTime)
              return true;
            else
              return false;
          });

          return conflictingEvent == null;
        }
        else
          return true;
      });
  }

  /****************************************************************************
  * Creates an event.
  *
  * @param {variant} event The event date and time or title.
  * @param {date} newDateTime The new date and time.
  * @param {integer} duration The new duration.
  * @param {array} attendeesToRemove The names of attendees to remove.
  * @param {array} newAttendees The names of attendees to add.
  ****************************************************************************/
  updateEvent(event, newDateTime, duration, attendeesToRemove, newAttendees)
  {
    // TODO: Implement
  }
}

/******************************************************************************
* Authenticates the application with the user and Google.
*
* @this An instance of GoogleCalendar.
* @returns {boolean} True if the user authenticated with Google, false
* otherwise.
******************************************************************************/
function authenticate()
{
  let applicationCredentials =
  {
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "client_id": this.config.googleClientId,
    "client_secret": this.config.googleClientSecret,
    "project_id": this.config.googleProjectId,
    "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
    "token_uri": "https://accounts.google.com/o/oauth2/token"
  }

  try
  {
    let self = this;
    authorize(applicationCredentials, oauth2Client =>
    {
      self.isAuthentected = true;
      self.oauth2Client = oauth2Client;
    });
  }
  catch (e)
  {
    console.log(e);
  }
}

/******************************************************************************
* Creates an OAuth2 client with the application credentials, then executes the
* given callback function.
*
* @param {Object} credentials The client application credentials.
* @param {function} callback The callback function.
******************************************************************************/
function authorize(credentials, callback)
{
  let auth = new googleAuth();
  let oauth2Client = new auth.OAuth2(credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uris[0]);

  if (!fs.existsSync(TOKEN_PATH))
    getNewToken(oauth2Client, callback);
  else
  {
    // Check for a previously stored a token
    try
    {
      let authToken = fs.readFileSync(TOKEN_PATH);//, (e, authToken) =>

      if (authToken.toString().trim().length == 0)
        getNewToken(oauth2Client, callback);
      else
      {
        oauth2Client.credentials = JSON.parse(authToken);
        callback(oauth2Client);
      }
    }
    catch (e)
    {
      getNewToken(oauth2Client, callback);
    }
  }
}

/******************************************************************************
* Finds an event by date and time or title.
*
* @param {object} calendar A Google calendar object.
* @param {object} oauth2Client The oauth 2 client.
* @param {variant} event A date with the event date/time or string containing
* the event title.
* @returns {object} A Promise.
******************************************************************************/
function findEvent(calendar, oauth2Client, event)
{
  return getEvents(calendar, oauth2Client)
    .then(events =>
    {
      if (!events || !events.length)
        return null;

      return events.find(existingEvent =>
      {
        if (typeof (event) === "object")
        {
          let startTime = existingEvent.start.dateTime ? new Date(existingEvent.start.dateTime) : new Date(existingEvent.start.date);
          return (startTime.valueOf() == event.valueOf());
        }
        else if (typeof (event) === "string")
        {
          let title = existingEvent.subject || existingEvent.summary;
          return title.toLowerCase() == event.toLowerCase();
        }
      });
    });
}

/******************************************************************************
* Gets a list of up to 100 events.
*
* @param {object} calendar A Google calendar object.
* @param {object} oauth2Client The oauth 2 client.
* @param {object} startTime The starting date/time to get events.
* @param {object} endTime The ending date/time to get events.
* @returns {object} A Promise.
******************************************************************************/
function getEvents(calendar, oauth2Client, startTime, endTime)
{
  return new Promise((resolve, reject) =>
  {
    calendar.events.list(
    {
      auth: oauth2Client,
      calendarId: "primary",
      timeMin: startTime ? startTime.toISOString() : (new Date()).toISOString(),
      timMax: endTime ? endTime.toISOString() : (new Date(new Date().getDate() + 7)).toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime"
    },
    function(e, response) 
    {
      if (e)
        console.log(`Failed to retrieve events: ${e}.`);
      else if (response.items && response.items.length)
        resolve(response.items);
      else
        resolve(null);
    });
  });
}

/******************************************************************************
* Prompt the user for authentication and authorization of the client
* application. After successful auth/auth, store the new token, then execute
* the given callback with the authorized OAuth2 client.
*
* @param {object} oauth2Client The OAuth2 client.
* @param {function} callback The callback function.
******************************************************************************/
function getNewToken(oauth2Client, callback)
{
  let authUrl = oauth2Client.generateAuthUrl(
  {
    access_type: "offline",
    scope: SCOPES
  });

  console.log("Authorize this app by visiting this url: ", authUrl);

  let authCode = readlineSync.question("Enter the code from that page here: ");

  if (authCode)
  {
    let authTokenRetrieved = false;

    oauth2Client.getToken(authCode, (e, token) =>
    {
      if (e)
        throw new Error(`Failed to retrieve an access token: ${e}.`);
      else
      {
        authTokenRetrieved = true;
        oauth2Client.credentials = token;
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(authToken));
        console.log("Auth token stored.");

        callback(oauth2Client);
      }
    });

    let timeout = 0;
    while (!authTokenRetrieved && timeout <= TIMEOUT)
    {
      console.log("Sleeping...");
      sleep(500);
      timeout += 500;
    }

    if (timeout >= TIMEOUT)
      throw new Error("Timeout exceeded while waiting for Google to authenticate application.");
  }
  else
    throw new Error("No authorization code given.");
}

/****************************************************************************
* Attempts to resolve an email address using a person's name.
*
* @param {string} name The attendee's name.
****************************************************************************/
function resolveEmail(name)
{
  let tokens = name.split(" ");

  if (tokens.length > 1)
    return tokens[0] + "." + tokens[1] + "@bogus-email.com";
  else
    return tokens[0] + "@bogus-email.com";
}

module.exports = GoogleCalendar;