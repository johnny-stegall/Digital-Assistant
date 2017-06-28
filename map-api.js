"use strict";

/****************************************************************************
* An abstract class to query a map API.
****************************************************************************/
class MapApi
{
  /****************************************************************************
  * Gets directions to a point of interest. 
  *
  * @param {string} origin The current coordinates in latitude and longitude.
  * @param {string} destination The name or address of the destination.
  * @returns {array} Step-by-step directions.
  ****************************************************************************/
  getDirections(origin, destination)
  {
  }

  /****************************************************************************
  * Queries a map API to perform a search.
  *
  * @param {object} query An object with properties that map to the map API.
  ****************************************************************************/
  search(query)
  {
  }

  /****************************************************************************
  * Displays a map.
  *
  * @param {object} query An object with properties that map to the map API.
  ****************************************************************************/
  showMap()
  {
  }
}

module.exports = MapApi;