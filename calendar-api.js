"use strict";

/****************************************************************************
* An abstract class to query a calendar API.
****************************************************************************/
class CalendarApi
{
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
  }

  /****************************************************************************
  * Deletes an event.
  *
  * @param {variant} event The event date and time or title.
  ****************************************************************************/
  deleteEvent(event)
  {
  }

  /****************************************************************************
  * Queries a calendar API to check availability.
  *
  * @param {date} dateTime The date and time to check.
  * @param {integer} duration The duration in minutes.
  * @returns {boolean} True if the calendar is open, false otherwise.
  ****************************************************************************/
  isAvailable(dateTime, duration)
  {
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
  }
}

module.exports = CalendarApi;