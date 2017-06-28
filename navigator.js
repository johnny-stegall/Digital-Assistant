"use strict";

const CURRENT_ADDRESS = "5905 Legacy Dr, Plano, TX";
const CURRENT_COORDINATES = "33.078855,-96.826350";
const LOCAL = "5 miles";

/****************************************************************************
* A class to perform navigation: search for places, get directions, and
* display maps.
****************************************************************************/
class Navigator
{
  /**************************************************************************
  * Creates an instance of Navigator.
  *
  * @param {object} botBuilder The bot builder.
  * @param {object} mapApi An object that allows querying a map.
  **************************************************************************/
  constructor(botBuilder, mapApi)
  {
    this.botBuilder = botBuilder;
    this.mapApi = mapApi;
    this.nextPageToken = null;
    this.pageIndex = -1;
    this.pages = [];
  }

  /**************************************************************************
  * Gets the user's current location if available from the client, otherwise
  * uses a default location.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  getCurrentLocation(session, args, next)
  {
    if (session.message && session.message.entities)
    {
      let userInfo = session.message.entities.find((e) =>
      {
        return e.type === "UserInfo";
      });

      if (userInfo)
      {
        let currentLocation = userInfo["CurrentLocation"];

        if (currentLocation)
          return `${currentLocation.Hub.Latitude},${currentLocation.Hub.Longitude}`;
      }
    }

    return CURRENT_COORDINATES;
  }

  /**************************************************************************
  * Lists any places found.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  listPlaces(session, args, next)
  {
    let places = this.pages[this.pageIndex];
    let placeCards = [];

    for (let placeIndex = 0; placeIndex < places.length; placeIndex++)
      placeCards.push(toCard(places[placeIndex], this.botBuilder));

    let message = new this.botBuilder.Message()
      .attachmentLayout(this.botBuilder.AttachmentLayout.list)
      .attachments(placeCards);

    if (this.pages.length === 1)
      session.send(`I found at least ${places.length} places.`);
    else
      session.send(`I found another ${places.length} places.`);

    session.send(message);
    session.send("Would you like additional details on any of them?");
  }

  /**************************************************************************
  * Gets the next "page" of places from search results. Intelligently
  * determines whether cached results can be used or more results are needed
  * from the map API.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  nextPage(session, args, next)
  {
    if (this.pageIndex == this.pages.length - 1)
    {
      if (this.nextPageToken)
      {
        let query =
          {
            pageToken: this.nextPageToken
          };

        let self = this;

        this.mapApi
          .search(query)
          .then(function(places)
          {
            self.nextPageToken = places.nextPageToken;
            places = places.places;

            self.pageIndex++;
            self.pages.push(places);
            self.listPlaces(session);
            session.replaceDialog("Map-Search");
            return;
          });
      }
      else
        session.send("There's no more results.");
    }
    else
    {
      this.pageIndex++;
      this.listPlaces(session);
      session.replaceDialog("Map-Search");
    }
  }

  /**************************************************************************
  * Gets the previous "page" of places from search results. Always retrieves
  * cached results.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  previousPage(session, args, next)
  {
    if (this.pageIndex === 0)
      session.send("You're on the first page of results.");
    else
    {
      this.pageIndex--;
      this.listPlaces(session);
      session.replaceDialog("Map-Search");
    }
  }

  /**************************************************************************
  * Goes back to the first page of results.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  restartListing(session, args, next)
  {
    this.pageIndex = 0;
    this.listPlaces(session);
    session.replaceDialog("Map-Search");
  }

  /**************************************************************************
  * Searches an area for the specified point of interest criteria. Caches
  * the page information and the results returned.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  search(session, args, next)
  {
    let poiEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Map.PointOfInterest");
    let placeNameEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Place.Name");
    let placeTypeEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Place.Type");
    let dimensionEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.dimension");
    let durationEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.duration");
    let destinationEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Map.Destination");
    let cityEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.geography.city");
    let geographyEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.geography.pointOfInterest");
    let adjectiveEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Map.Adjective");
    let priceEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Place.Price");
    let ratingEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Place.Rating");
    let proximityEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Map.Proximity");
    let query = {};

    if (placeTypeEntity)
      query.pointOfInterest = placeTypeEntity.entity;
    else if (placeNameEntity)
      query.pointOfInterest = placeNameEntity.entity;

    if (dimensionEntity)
      query.radius = convertToMeters(dimensionEntity.entity);
    else if (proximityEntity && (proximityEntity.entity == "nearby" || proximityEntity.entity == "near by" || proximityEntity.entity == "close by"))
      query.radius = convertToMeters(LOCAL);
    else if (durationEntity)
      query.pointOfInterest += ` within ${durationEntity.entity}`;
    else
      query.radius = convertToMeters(LOCAL);

    if (destinationEntity)
      query.pointOfInterest += ` of ${destinationEntity.entity}`;
    else if (cityEntity)
      query.pointOfInterest += ` of ${cityEntity.entity}`;
    else if (geographyEntity)
      query.pointOfInterest += ` of ${destinationEntity.entity}`;
    else
      query.coordinates = this.getCurrentLocation(session);

    if (priceEntity)
    {
      if (priceEntity.entity === "cheap")
        query.maxPrice = 2;
      else if (priceEntity.entity === "cheapest")
        query.maxPrice = 1;
      if (priceEntity.entity === "expensive")
        query.minPrice = 3;
    }

    let self = this;

    this.mapApi
      .search(query)
      .then(function(places)
      {
        self.nextPageToken = places.nextPageToken;
        places = places.places;

        if (places.length)
        {
          if (proximityEntity && (proximityEntity.entity == "closest" || proximityEntity.entity == "nearest"))
            places.splice(1, places.length);

          self.pageIndex++;
          self.pages.push(places);
          self.listPlaces(session);
          session.beginDialog("Map-Search");
        }
        else
        {
          session.send("Sorry, I couldn't find anything.");
          session.endDialog();
        }

        return;
      });
  }

  /**************************************************************************
  * Selects a place from a list of search results.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  selectPlace(session, args, next)
  {
    let placeNameEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Place.Name");
    let ordinalEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.ordinal");
    let numberEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.number");
    let place = null;
    let placeIndex = null;

    if (placeNameEntity)
    {
      placeIndex = this.pages[this.pageIndex].findIndex((element, index) =>
      {
        if (element.name.toLowerCase().includes(placeNameEntity.entity.toLowerCase()))
          return true;
        else
          return false;
      })
    }
    else if (ordinalEntity)
      placeIndex = parseInt(ordinalEntity.resolution.value) - 1;
    else if (numberEntity)
      placeIndex = parseInt(numberEntity.resolution.value) - 1;

    place = this.pages[this.pageIndex][placeIndex];

    if (place)
    {
      session.send(`What can I tell you about ${place.name}?`);
      session.beginDialog("Place-Details");
      let clonedPlace = JSON.parse(JSON.stringify(place));
      session.dialogData.place = place;
    }
    else
      session.send("I'm sorry, I didn't understand that. Can you try again?");
  }

  /**************************************************************************
  * Displays the map.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  showMap(session, args, next)
  {
    let coords = this.getCurrentLocation(session);
    let query =
      {
        center: coords,
        size: "600x600",
        zoom: 18
      };

    let mapUrl = this.mapApi.showMap(query);
    let mapCard = new this.botBuilder.HeroCard()
      .title("Your Location")
      .text("Here's where you are.")
      .images([new this.botBuilder.CardImage().url(mapUrl)]);

    let message = new this.botBuilder.Message()
      .attachmentLayout(this.botBuilder.AttachmentLayout.list)
      .attachments([mapCard]);

    session.send(message);
  }

  /**************************************************************************
  * Stops directions.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  stopDirections(session, args, next)
  {
    session.endDialog();
  }
}

/**************************************************************************
* Converts miles to meters.
*
* @param {string} distance The phrase containing the distance.
* @returns {number} The number of meters.
**************************************************************************/
function convertToMeters(distance)
{
  let magnitude = distance.match(/[0-9]+/i);
  let factor = 1;

  if (distance.match(/mile/i))
    factor = 1609;
  else if (distance.match(/km/i))
    factor = 1000;

  if (magnitude)
    return magnitude[0] * factor;
  else
    return 1000;
}

/**************************************************************************
* Creates a Card from details of a Place.
*
* @param {object} place The place.
* @param {object} botBuilder The bot builder.
* @returns {object} A HeroCard with place details and actions.
**************************************************************************/
function toCard(place, botBuilder)
{
  let buttons =
    [
      new botBuilder.CardAction()
        .title("Details")
        .type("openUrl")
        .value(place.url),
      new botBuilder.CardAction()
        .title("Get Directions")
        .type("openUrl")
        .value(place.directionsUrl),
    ];

  return new botBuilder.HeroCard()
    .title(place.name)
    .text(place.address)
    .subtitle(`Rating: ${place.rating} stars/Price: ${place.price}`)
    .images([new botBuilder.CardImage().url(place.icon)])
    .buttons(buttons);
}

module.exports = Navigator;