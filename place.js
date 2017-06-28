"use strict";

/****************************************************************************
* A class to query a map API to get details about a specific place.
****************************************************************************/
class Place
{
  /**************************************************************************
  * Creates an instance of Place.
  **************************************************************************/
  constructor()
  {
    this.address = null;
    this.directionsUrl = null;
    this.hours = null;
    this.icon = null;
    this.id = null;
    this.isOpen = null;
    this.latitude = null;
    this.longitude = null;
    this.name = null;
    this.phoneNumber = null;
    this.price = null;
    this.rating = null;
    this.reviews = null;
    this.types = null;
    this.url = null;
  }

  /**************************************************************************
  * Calls a place.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  static call(session, args, next)
  {
    // Pretend to call, don't actually do it
    session.say(`Calling ${session.dialogData.place.phoneNumber}...`, `Calling ${session.dialogData.place.phoneNumber}...`);
    session.say(`Is there anything else I can tell you about ${session.dialogData.place.name}?`);
  }

  /**************************************************************************
  * Makes reservations at a place.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  static makeReservation(session, args, next)
  {
    let botBuilder = args.botBuilder;
    let calendarApi = args.calendarApi;
    let numberEntities = botBuilder.EntityRecognizer.findAllEntities(args.entities, "builtin.number");
    let dateTimeEntity = botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.datetime");
    let dateEntity = botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.date");
    let timeEntity = botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.time");
    let dateTime;
    let partySize;

    if (!dateTimeEntity && (!dateEntity || !timeEntity))
    {
      session.conversationData.place = session.dialogData.place;
      session.beginDialog("Make-Reservation");
    }
    else
    {
      dateTime = toDate(dateTimeEntity, dateEntity, timeEntity);
      partySize = resolvePartySize(numberEntities, dateTimeEntity, dateEntity, timeEntity);

      calendarApi.createEvent(dateTime, 90, `Reservation at ${session.dialogData.place.name}`);

      let locale =
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      };

      session.send(`I've created a reservation at ${session.dialogData.place.name} on ${dateTime.toLocaleString("en-US", locale)} for ${partySize}.`);
      session.say(`Is there anything else I can tell you about ${session.dialogData.place.name}?`);
    }
  }

  /**************************************************************************
  * Gets the address of a place.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  static speakAddress(session, args, next)
  {
    session.say(`The address is: ${session.dialogData.place.address}.`, `${session.dialogData.place.address}`);
    session.say(`Is there anything else I can tell you about ${session.dialogData.place.name}?`);
  }

  /**************************************************************************
  * Gets directions to a place.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  static speakDirections(session, args, next)
  {
    let mapApi = args.mapApi;

    mapApi
      .getDirections(session.dialogData.origin, session.dialogData.place.address)
      .then(function(routes)
      {
        if (routes)
        {
          for (let routeIndex = 0; routeIndex < routes.length; routeIndex++)
            session.say(routes[routeIndex].summary, routes[routeIndex].summary);
        }
        else
          session.say(`Sorry, but I'm struggling finding your destination.`);

        session.say(`Is there anything else I can tell you about ${session.dialogData.place.name}?`);
      });
  }

  /**************************************************************************
  * Gets a place's hours of operation.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  static speakHours(session, args, next)
  {
    let place = session.dialogData.place;

    if (place.hours)
    {
      let dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      for (let dayIndex = 0; dayIndex < place.hours.length; dayIndex++)
      {
        if (place.hours[dayIndex].close)
          session.say(`${dayOfWeek[place.hours[dayIndex].open.day]}: ${place.hours[dayIndex].open.time}-${place.hours[dayIndex].close.time}`);
        else
          session.say(`${dayOfWeek[place.hours[dayIndex].open.day]}: Open 24 hours`);
      }
    }
    else
      session.say("Sorry, but their hours aren't available.");

    session.say(`Is there anything else I can tell you about ${session.dialogData.place.name}?`);
  }

  /**************************************************************************
  * Gets a place's menu.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  static speakMenu(session, args, next)
  {
    session.say("Sorry, but retrieving menus hasn't been implemented yet.", "Sorry, but retrieving menus hasn't been implemented yet.");
    session.say(`Is there anything else I can tell you about ${session.dialogData.place.name}?`);
  }

  /**************************************************************************
  * Gets a place's phone number.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  static speakPhoneNumber(session, args, next)
  {
    if (session.dialogData.place.phoneNumber)
      session.say(`Their phone number is: ${session.dialogData.place.phoneNumber}.`, `${session.dialogData.place.phoneNumber}`);
    else
      session.say("Sorry, their phone number isn't available.");

    session.say(`Is there anything else I can tell you about ${session.dialogData.place.name}?`);
  }

  /**************************************************************************
  * Gets a place's price range.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  static speakPriceRange(session, args, next)
  {
    if (session.dialogData.place.price)
      session.say(`Their price range is approximately ${session.dialogData.place.price * 15} dollars per meal.`, `Their price range is approximately ${session.dialogData.place.price * 15} dollars per meal.`);
    else
      session.say("Sorry, their price range isn't available.");

    session.say(`Is there anything else I can tell you about ${session.dialogData.place.name}?`);
  }
  
  /**************************************************************************
  * Gets a place's rating.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  static speakRating(session, args, next)
  {
    if (session.dialogData.place.rating)
      session.say(`They have a ${session.dialogData.place.rating}-star rating.`, `They have a ${session.dialogData.place.rating}-star rating.`);
    else
      session.say("Sorry, but they aren't rated.");

    session.say(`Is there anything else I can tell you about ${session.dialogData.place.name}?`);
  }
}

/****************************************************************************
* LUIS isn't smart enough to exclude entities already resolved from an
* intent. As such, time and date gets included with party size in the
* reservation. This method resolves party size from the intent.
*
* @param {array} numberEntities An array of number entities.
* @param {object} dateTimeEntity A date/time entity.
* @param {object} dateEntity A date entity.
* @param {object} timeEntity A time entity.
* @returns {number} The size of the party.
****************************************************************************/
function resolvePartySize(numberEntities, dateTimeEntity, dateEntity, timeEntity)
{
  if (!numberEntities || !numberEntities.length)
    return 0;

  let numbers = numberEntities.slice();

  for (let entityIndex = 0; entityIndex < numbers.length; entityIndex++)
  {
    if (numbers[entityIndex].entity.match(/[\.\-\+\*\/\(\)\\]/))
    {
      // The built-in LUIS numbers entity will pick up math formulas (e.g. a
      // date of 2/29/2020 will pick up 29/2020) that must be removed
      numbers.splice(entityIndex, 1);
      entityIndex--;
    }
    else if (dateTimeEntity && dateTimeEntity.entity.indexOf(numbers[entityIndex].resolution.value) > -1)
    {
      numbers.splice(entityIndex, 1);
      entityIndex--;
    }
    else if (dateEntity && dateEntity.entity.indexOf(numbers[entityIndex].resolution.value) > -1)
    {
      numbers.splice(entityIndex, 1);
      entityIndex--;
    }
    else if (timeEntity && timeEntity.entity.indexOf(numbers[entityIndex].resolution.value) > -1)
    {
      numbers.splice(entityIndex, 1);
      entityIndex--;
    }
  }

  if (numbers.length === 1)
    return parseInt(numbers[0].resolution.value);
  else
  {
    let duplicates = [];
    let partySize = numberEntities.slice().filter(function(item)
    {
      if (!duplicates.indexOf(item.resolution.value) > -1)
      {
        duplicates.push(item);
        return true;
      }
    })[0];

    return parseInt(partySize.resolution.value);
  }
}

/****************************************************************************
* Creates a JavaScript date object from built-in LUIS datetime entities.
*
* @param {object} dateTimeEntity A datetime entity.
* @param {object} dateEntity A date entity.
* @param {object} timeEntity A time entity.
* @returns {date} A date (and time if available).
****************************************************************************/
function toDate(dateTimeEntity, dateEntity, timeEntity)
{
  if (dateTimeEntity)
    return new Date(dateTimeEntity.resolution.values[dateTimeEntity.resolution.values.length - 1].value);
  else
  {
    let dateTime = "";

    if (dateEntity)
      dateTime += `${dateEntity.resolution.values[dateEntity.resolution.values.length - 1].value}`;

    if (timeEntity)
      dateTime += ` ${timeEntity.resolution.values[timeEntity.resolution.values.length - 1].value}`;

    if (dateTime.trim.length > 0)
      return new Date(dateTime);
    else
      return null;
  }
}

module.exports = Place;