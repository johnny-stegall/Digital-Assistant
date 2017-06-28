"use strict";

const MapApi = require("./map-api.js");
const Place = require("./place.js");
const fetch = require("node-fetch");
const fs = require("fs");
const navigator = require("./navigator.js");

const CURRENT_ADDRESS = "5905 Legacy Dr, Plano, TX";
const GOOGLE_MAPS_DIRECTIONS = "https://maps.googleapis.com/maps/api/directions/json";
const GOOGLE_MAPS_STATIC_MAP = "https://maps.googleapis.com/maps/api/staticmap";
const GOOGLE_MAPS_TEXT_SEARCH = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const GOOGLE_MAPS_NEARBY_SEARCH = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const GOOGLE_MAPS_PLACE_DETAILS = "https://maps.googleapis.com/maps/api/place/details/json";
const GOOGLE_DIRECTIONS_API = "https://maps.googleapis.com/maps/api/directions/json?origin=";

/****************************************************************************
* A class for getting location, direction, and place information from Google
* Maps.
****************************************************************************/
class GoogleMaps extends MapApi
{
  /**************************************************************************
  * Creates an instance of GoogleMaps.
  *
  * @param {object} config Configuration settings.
  **************************************************************************/
  constructor(config)
  {
    super();
    this.config = config;
  }

  /****************************************************************************
  * Gets directions to a point of interest.
  *
  * @param {string} origin The current coordinates in latitude and longitude.
  * @param {string} destination The name or address of the destination.
  * @returns {array} Step-by-step directions.
  ****************************************************************************/
  getDirections(origin, destination)
  {
    return fetch(`${GOOGLE_DIRECTIONS_API}${origin}&destination=${destination}&key=${this.config.googleDirectionsApiKey}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
    .then(function(response)
    {
      return (response.status >= 200 && response.status < 300) ? response.json() : Promise.reject(new Error(response.statusText));
    })
    .then(function(directions)
    {
      return directions.routes;
    })
    .catch(e => console.log(e));
  }

  /****************************************************************************
  * Queries a map API to perform a search.
  *
  * @param {object} query An object that contains the following properties:
  * center, zoom, size, format, mapType, markers, path, locations, style, and
  * pageToken.
  * @returns {object} An object that contains the next page token and an array
  * of places for the current page.
  ****************************************************************************/
  search(query)
  {
    if (!query)
      return;

    let googleMapsUrl = GOOGLE_MAPS_TEXT_SEARCH + `?key=${this.config.googleMapsApiKey}`;

    if (query.pointOfInterest)
      googleMapsUrl += `&query=${query.pointOfInterest}`;

    if (query.radius)
      googleMapsUrl += `&radius=${query.radius}`;

    if (query.coordinates)
      googleMapsUrl += `&location=${query.coordinates}`;

    if (query.minPrice)
      googleMapsUrl += `&minprice=${query.minPrice}`;

    if (query.maxPrice)
      googleMapsUrl += `&maxprice=${query.maxPrice}`;

    if (query.pageToken)
      googleMapsUrl += `&pagetoken=${query.pageToken}`;

    let self = this;
    let nextPageToken = null;

    return fetch(googleMapsUrl,
    {
      method: "GET",
      headers: {"Content-Type": "application/json"},
    })
    .then(function(response)
    {
      return (response.status >= 200 && response.status < 300) ? response.json() : Promise.reject(new Error(response.statusText));
    })
    .then(function(googlePlaces)
    {
      nextPageToken = googlePlaces.next_page_token;
      return Promise.all(googlePlaces.results.map(toPlace, self));
    })
    .then(function(places)
    {
      return {
        nextPageToken: nextPageToken,
        places: places
      };
    })
    .catch(e => console.log(e));
  }

  /****************************************************************************
  * Displays a map.
  *
  * @param {object} query An object that contains the following properties:
  * center, zoom, size, format, mapType, markers, path, locations, and style.
  * @returns {string} The map URL.
  ****************************************************************************/
  showMap(query)
  {
    if (!query)
      return;

    let googleMapsUrl = GOOGLE_MAPS_STATIC_MAP + `?key=${this.config.googleMapsApiKey}`;

    if (query.center)
      googleMapsUrl += `&center=${query.center}`;

    if (query.zoom)
      googleMapsUrl += `&zoom=${query.zoom}`;

    if (query.size)
      googleMapsUrl += `&size=${query.size}`;

    return googleMapsUrl;
  }
}

/****************************************************************************
* Converts the Google Places representation of a place into a Place.
*
* @this A GoogleMaps instance.
* @param {object} mapPlace A place.
****************************************************************************/
function toPlace(mapPlace)
{
  if (!mapPlace)
    return null;

  let place = new Place();
  place.address = mapPlace.formatted_address;
  place.directionsUrl = `https://www.google.com/maps/dir/${CURRENT_ADDRESS}/${place.address}/`;
  place.id = mapPlace.place_id;
  place.name = mapPlace.name;
  place.price = (mapPlace.price_level) ? mapPlace.price_level : 0;
  place.types = mapPlace.types;

  if (mapPlace.geometry && mapPlace.geometry.location)
  {
    place.latitude = mapPlace.geometry.location.lat;
    place.longitude = mapPlace.geometry.location.lng;
  }

  if (mapPlace.opening_hours)
    place.isOpen = mapPlace.opening_hours.open_now;

  if (mapPlace.photos && mapPlace.photos.length && mapPlace.photos[0].html_attributions.length)
  {
    let hrefRegEx = /\<a href="(.+)"\>.+\<\/a\>/;
    let hrefMatches = mapPlace.photos[0].html_attributions[0].match(hrefRegEx);

    if (hrefMatches.length)
      place.icon = hrefMatches[1];
    else
      place.icon = mapPlace.icon;
  }
  else
    place.icon = mapPlace.icon;

  return fetch(GOOGLE_MAPS_PLACE_DETAILS + `?key=${this.config.googlePlacesApiKey}&placeid=${place.id}`,
  {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
  .then(function(response)
  {
    return (response.status >= 200 && response.status < 300) ? response.json() : Promise.reject(new Error(response.statusText));
  })
  .then(function(details)
  {
    if (details.result)
    {
      if (details.result.opening_hours)
        place.hours = details.result.opening_hours.periods;

      place.phoneNumber = details.result.formatted_phone_number;
      place.rating = (mapPlace && mapPlace.rating) ? mapPlace.rating : 0;
      place.reviews = details.result.reviews;
      place.url = details.result.url;
    }

    return place;
  })
  .catch(e => console.log(e));
}

module.exports = GoogleMaps;