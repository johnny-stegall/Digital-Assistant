"use strict";

require("dotenv-extended").load(); 

const useEmulator = (process.env.nodeEnv == "development");
const botBuilder = require("botbuilder");
const azureBotBuilder = require("botbuilder-azure");

const Calendar = require("./calendar.js");
const GoogleMaps = require("./google-maps.js");
const GoogleCalendar = require("./google-calendar.js");
const Navigator = require("./navigator.js");
const Place = require("./place.js");

let botConnector = setupBotBuilder();
const bot = new botBuilder.UniversalBot(botConnector);

// LUIS credentials
const luisAppUrl = `https://${process.env.luisAPIHostName}/luis/v2.0/apps/${process.env.luisAppId}?subscription-key=${process.env.luisAPIKey}&timezoneOffset=${process.env.luisTimezoneOffset}`;
const luisRecognizer = new botBuilder.LuisRecognizer(luisAppUrl);

// Setup LUIS intent dialogs
const rootIntents = new botBuilder.IntentDialog({ recognizers: [luisRecognizer] });
const mapIntents = new botBuilder.IntentDialog({ recognizers: [luisRecognizer] });
const placeIntents = new botBuilder.IntentDialog({ recognizers: [luisRecognizer] });

let calendarApi = setupCalendarApi();
let mapApi = setupMapApi();
let calendar = new Calendar(botBuilder, calendarApi);
let navigator = new Navigator(botBuilder, mapApi);

// Anytime the major version is incremented any existing conversations will be
// restarted
bot.use(botBuilder.Middleware.dialogVersion({ version: 1.0, resetCommand: /^reset/i }));

// Setup dialogs
bot.dialog("/", rootIntents);
bot.dialog("Map-Search", mapIntents);
bot.dialog("Place-Details", placeIntents);
bot.dialog("Delete-Event",
  [
    calendar.confirmEventRemoval.bind(calendar),
    calendar.deleteEvent.bind(calendar)
  ]);

rootIntents
  .matches("Calendar.CreateEvent", calendar.createEvent.bind(calendar))
  .matches("Calendar.DeleteEvent", (session, args) => session.beginDialog("Delete-Event", args))
  .matches("Calendar.IsAvailable", calendar.checkAvailability.bind(calendar))
  .matches("Calendar.UpdateEvent", calendar.updateEvent.bind(calendar))
  .matches("Map.Search", navigator.search.bind(navigator))
  .matches("Map.Show", navigator.showMap.bind(navigator))
  .onDefault(session => session.send(`I didn't understand "${session.message.text}".`));

mapIntents
  .matches("Dialog.End", function(session)
  {
    session.endDialog();
  })
  .matches("Map.NextPage", navigator.nextPage.bind(navigator))
  .matches("Map.PreviousPage", navigator.previousPage.bind(navigator))
  .matches("Map.RestartListing", navigator.restartListing.bind(navigator))
  .matches("Map.Selection", navigator.selectPlace.bind(navigator))
  .onDefault(session => session.send(`I didn't understand "${session.message.text}".`));

placeIntents
  .matches("Dialog.End", function(session)
  {
    session.endDialog();
  })
  .matches("Place.Call", Place.call)
  .matches("Place.GetAddress", Place.speakAddress)
  .matches("Place.GetDirections", (session, args) =>
  {
    args.mapApi = mapApi;
    session.dialogData.origin = navigator.getCurrentLocation(session);
    Place.speakDirections(session, args);
  })
  .matches("Place.GetHours", Place.speakHours)
  .matches("Place.GetMenu", Place.speakMenu)
  .matches("Place.GetPhoneNumber", Place.speakPhoneNumber)
  .matches("Place.GetPriceRange", Place.speakPriceRange)
  .matches("Place.GetRating", Place.speakRating)
  .matches("Place.MakeReservation", (session, args) =>
  {
    args.botBuilder = botBuilder;
    args.calendarApi = calendarApi;
    Place.makeReservation(session, args);
  })
  .onDefault(session => session.send(`I didn't understand "${session.message.text}".`));

bot.dialog("Make-Reservation",
  [
    (session, args) => session.beginDialog("Reservation-Date-and-Time", args),
    function(session, results)
    {
      session.dialogData.reservation = { dateTime: botBuilder.EntityRecognizer.resolveTime([results.response]) };
      session.beginDialog("Reservation-Party-Size");
    },
    function(session, results)
    {
      session.dialogData.reservation.partySize = results.response;
      session.beginDialog("Reservation-Name");
    },
    function(session, results)
    {
      // The Bot Framework uses the JSON deep clone hack; convert the serialized
      // date back into a Date object
      session.dialogData.reservation.dateTime = new Date(session.dialogData.reservation.dateTime);
      session.dialogData.reservation.name = results.response;
      calendarApi.createEvent(session.dialogData.reservation.dateTime,
        90,
        `Reservation at ${session.conversationData.place.name}`,
        session.conversationData.place.address || session.conversationData.place.name);

      let locale =
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      };

      session.send(`I've created a reservation at ${session.conversationData.place.name} on ${dateTime.toLocaleString("en-US", locale)} for ${session.dialogData.reservation.partySize}.`);
      session.endDialog();
      delete session.conversationData.place;
    }
  ])
  .triggerAction(
  {
    matches: /^dinner reservation$/i,
    confirmPrompt: "Are you sure you don't want to make a reservation?"
  });

bot.dialog("Reservation-Date-and-Time",
  [
    session => botBuilder.Prompts.time(session, "When would you like to make the reservation?"),
    (session, results) => session.endDialogWithResult(results)
  ]);

bot.dialog("Reservation-Party-Size",
  [
    session => botBuilder.Prompts.number(session, "How many people are in your party?"),
    (session, results) => session.endDialogWithResult(results)
])

bot.dialog("Reservation-Name",
[
  session => botBuilder.Prompts.text(session, "Who's name will this reservation be under?"),
  (session, results) => session.endDialogWithResult(results)
]);

/******************************************************************************
* Configures the bot builder.
*
* @returns {object} A bot builder connector.
******************************************************************************/
function setupBotBuilder()
{
  if (useEmulator)
  {
    if (process.env.appId.trim().length > 0)
    {
      return new botBuilder.ChatConnector(
      {
        appId: process.env.appId,
        appPassword: process.env.appPassword
      });
    }
    else
    {
      return new botBuilder.ChatConnector(
      {
        appId: null,
        appPassword: null
      });
    }
  }
  else
  {
    return new azureBotBuilder.BotServiceConnector(
    {
      appId: process.env.appId,
      appPassword: process.env.appPassword,
      stateEndpoint: process.env.botStateEndpoint,
      openIdMetadata: process.env.botOpenIdMetadata
    });
  }
}

/******************************************************************************
* Configures the calendar API.
*
* @returns {object} A class the implements CalendarApi.
******************************************************************************/
function setupCalendarApi()
{
  if (process.env.calendarApi == "Google")
    return new GoogleCalendar(process.env);
}

/******************************************************************************
* Configures the map API.
*
* @returns {object} A class that implements Map-Api.
******************************************************************************/
function setupMapApi()
{
  if (process.env.mapApi == "Google")
    return new GoogleMaps(process.env);
}

if (useEmulator)
{
  let restify = require("restify");
  let server = restify.createServer();

  server.listen(process.env.port || 3978, function()
  {
    console.log("Test the bot endpoint at http://localhost:3978/api/messages");
  });

  server.post("/api/messages", botConnector.listen());
}
else
  module.exports = { default: botConnector.listen() };