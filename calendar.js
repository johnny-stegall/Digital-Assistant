"use strict";

/****************************************************************************
* A class to query a calendar API to manipulate meetings and reminders.
****************************************************************************/
class Calendar
{
  /**************************************************************************
  * Creates an instance of Calendar.
  *
  * @param {object} botBuilder The bot builder.
  * @param {object} calendarApi A class that implements CalendarApi.
  **************************************************************************/
  constructor(botBuilder, calendarApi)
  {
    this.botBuilder = botBuilder;
    this.calendarApi = calendarApi;
  }

  /**************************************************************************
  * Checks availability.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  checkAvailability(session, args, next)
  {
    let dateTimeEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.datetime");
    let dateEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.date");
    let timeEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.time");
    let durationEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.duration");
    let dateTime = toDate(dateTimeEntity, dateEntity, timeEntity);
    let duration = durationEntity ? durationEntity.resolution.values[durationEntity.resolution.values.length - 1].value / 60 : null;

    if (isNaN(dateTime))
      session.send("I'm sorry, but I didn't catch that date.");
    else
    {
      this.calendarApi
        .isAvailable(dateTime, duration)
        .then(function(isAvailable)
        {
          let confirmation = isAvailable ? "Yes, you're available" : "No, you're not available";

          if (dateTimeEntity)
            confirmation += ` ${dateTimeEntity.entity}`;
          else
          {
            if (dateEntity)
              confirmation += ` ${dateEntity.entity}`;

            if (timeEntity)
              confirmation += ` at ${timeEntity.entity}`;
          }

        if (durationEntity)
          confirmation += ` for ${durationEntity.entity}`;

        confirmation += ".";
        session.send(confirmation); 
      });
    }
  }

  /**************************************************************************
  * Creates a new event.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  createEvent(session, args, next)
  {
    let appointmentEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Calendar.Appointment");
    let attendeeEntities = this.botBuilder.EntityRecognizer.findAllEntities(args.entities, "Calendar.Attendee");
    let titleEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Calendar.Title");
    let locationEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Calendar.Location");
    let dateTimeEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.datetime");
    let dateEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.date");
    let timeEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.time");
    let durationEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.duration");
    let duration = durationEntity ? durationEntity.resolution.values[durationEntity.resolution.values.length - 1].value / 60 : 60;

    if (appointmentEntity)
    {
      let dateTime = toDate(dateTimeEntity, dateEntity, timeEntity);
      let attendees = buildAttendeeList(attendeeEntities);
      let title = buildTitle(titleEntity, appointmentEntity, attendees, session);

      this.calendarApi.createEvent(dateTime, duration, title, attendees);

      let confirmation = `I've added ${title}`;

      if (titleEntity)
      {
        if (attendeeEntities && attendeeEntities.length)
          confirmation += ` with ${attendees}`;
      }

      if (locationEntity)
        confirmation += ` at ${locationEntity.entity}`;

      if (dateTimeEntity)
        confirmation += ` ${dateTimeEntity.entity}`;
      else
      {
        if (dateEntity)
          confirmation += ` on ${dateEntity.entity}`;

        if (timeEntity)
          confirmation += ` at ${timeEntity.entity}`;
      }

      if (durationEntity)
        confirmation += ` for ${durationEntity.entity}`;

      confirmation += " to your calendar.";
      session.send(confirmation);
    }
    else
    {
      let dateTimeEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.datetime");
      let dateTime = toDate(dateTimeEntity, dateEntity, timeEntity);

      if (isNaN(dateTime))
        session.send("I think you're trying to create an appointment but I didn't catch the details. Can you try again?");
      else
      {
        let attendees = buildAttendeeList(attendeeEntities);
        let title = buildTitle(titleEntity, appointmentEntity, attendees, session);
        this.calendarApi.createEvent(dateTime, duration, title, attendeeEntities);
      }
    }
  }

  /**************************************************************************
  * Confirms the user wants to remove an event from their calendar.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  confirmEventRemoval(session, args, next)
  {
    let appointmentEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Calendar.Appointment");
    let attendeeEntities = this.botBuilder.EntityRecognizer.findAllEntities(args.entities, "Calendar.Attendee");
    let titleEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Calendar.Title");
    let title;
    let attendees;
    
    if (attendeeEntities && attendeeEntities.length > 0)
    {
      attendees = buildAttendeeList(attendeeEntities);
      title = buildTitle(titleEntity, appointmentEntity, attendees, session);
    }
    
    let dateTimeEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.datetime");
    let dateEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.date");
    let timeEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.time");
    let dateTimeToDelete = toDate(dateTimeEntity, dateEntity, timeEntity);
    let confirmation;

    if (title && (dateEntity || dateTimeEntity))
    {
      confirmation = `Are you sure you want to remove ${title}`;

      if (dateTimeEntity)
        confirmation += ` at ${dateTimeEntity.entity}`;
      else
      {
        if (dateEntity)
          confirmation += ` on ${dateEntity.entity}`;

        if (timeEntity)
          confirmation += ` at ${timeEntity.entity}`;
      }

      confirmation += " from your calendar?";
    }
    else
    {
      let locale =
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      };

      confirmation = `Are you sure you want to remove appointment scheduled on ${dateTimeToDelete.toLocaleString("en-US", locale)}`;
    }

    if (attendees && title || dateTimeToDelete)
    {
      let message = new this.botBuilder
        .Message(session)
        .text(confirmation)
        .suggestedActions(this.botBuilder.SuggestedActions.create(session,
          [
            this.botBuilder.CardAction.imBack(session, "Yes", "Yes"),
            this.botBuilder.CardAction.imBack(session, "Nevermind", "Nevermind")
          ]));

      session.dialogData.event =
      {
        attendees: attendees,
        title: title,
        date: dateTimeToDelete,
      };
    
      this.botBuilder.Prompts.choice(session, message, ["Yes", "Nevermind"]);
    }
    else
      session.send("I think you're trying to delete an appointment but I didn't catch the details. Can you try again?");
  }

  /**************************************************************************
  * Removes an event if the user gave a positive response, otherwise does
  * nothing.
  *
  * @param {object} session A bot session.
  * @param {object} results Dialog results.
  **************************************************************************/
  deleteEvent(session, results)
  {
    // The Bot Framework uses the JSON deep clone hack; convert the serialized
    // date back into a Date object
    session.dialogData.event.date = new Date(session.dialogData.event.date);

    if (results.response.entity === "Yes")
    {
      if (session.dialogData.event.title)
      {
        this.calendarApi
          .deleteEvent(session.dialogData.event.title)
          .then(function()
          {
            session.send(`I've removed ${session.dialogData.event.title} from your calendar.`);
          });
      }
      else
      {
        this.calendarApi
          .deleteEvent(session.dialogData.event.date)
          .then(function()
          {
            let locale =
            {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric"
            };
            session.send(`I've removed the appointment at ${session.dialogData.event.date.toLocaleString("en-US", locale)} from your calendar.`);
          });
      }
    }

    session.endDialog();
  }

  /**************************************************************************
  * Updates an existing event.
  *
  * @param {object} session A bot session.
  * @param {object} args Bot Framework arguments.
  * @param {function} next The next function to call.
  **************************************************************************/
  updateEvent(session, args, next)
  {
    let attendeeEntities = this.botBuilder.EntityRecognizer.findAllEntities(args.entities, "Calendar.Attendee");
    let titleEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Calendar.Title");
    let locationEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "Calendar.Location");
    let dateTimeEntities = this.botBuilder.EntityRecognizer.findAllEntities(args.entities, "builtin.datetimeV2.datetime");
    let dateEntities = this.botBuilder.EntityRecognizer.findAllEntities(args.entities, "builtin.datetimeV2.date");
    let timeEntities = this.botBuilder.EntityRecognizer.findAllEntities(args.entities, "builtin.datetimeV2.time");
    let durationEntity = this.botBuilder.EntityRecognizer.findEntity(args.entities, "builtin.datetimeV2.duration");

    let duration = durationEntity ? durationEntity.resolution.values[durationEntity.resolution.values.length - 1].value / 60 : null;
    let attendeesToRemove = null;
    let newAttendees = null;
    let event =
      {
        dateTime: toDate(dateTimeEntity, dateEntity, timeEntity),
        title: (titleEntity && titleEntity.entity) ? titleEntity.entity : null
      };

    if (event.dateTime || event.title)
    {
      this.calendarApi.updateEvent(event, newDateTime, duration, attendeesToRemove, newAttendees);

      let confirmation = `I've updated ${appointmentEntity.entity}`;

      if (locationEntity)
        confirmation += ` and moved it to ${locationEntity.entity}.`;
      else if (durationEntity)
        confirmation + ` and extended it by ${durationEntity.entity}.`;
      else
      {
        if (dateTimeEntity)
          confirmation += ` and rescheduled it to ${dateTimeEntity.entity}`;
        else
        {
          if (dateEntity)
            confirmation += ` and rescheduled it to ${dateEntity.entity}`;

          if (timeEntity)
            confirmation += ` at ${timeEntity.entity}`;
        }
      }

      session.send(confirmation);
    }
    else
      session.send("I think you're trying to update an appointment but I didn't catch the details. Can you try again?");
  }
}

/****************************************************************************
* Builds a list of attendees from the LUIS attendee entities.
*
* @param {array} attendeeEntities An array of LUIS entities.
* @returns {string} A comma-delimited list of attendees.
****************************************************************************/
function buildAttendeeList(attendeeEntities)
{
  let attendeeList = "";

  if (attendeeEntities && attendeeEntities.length)
  {
    for (let attendeeIndex = 0; attendeeIndex < attendeeEntities.length; attendeeIndex++)
    {
      if (attendeeIndex === 0)
        attendeeList += `${attendeeEntities[attendeeIndex].entity}`;
      else if (attendeeIndex == attendeeEntities.length - 1)
        attendeeList += `, and ${attendeeEntities[attendeeIndex].entity}`;
      else
        attendeeList += `, ${attendeeEntities[attendeeIndex].entity}`;
    }
  }

  return attendeeList;
}

/****************************************************************************
* Builds the title of a meeting.
*
* @param {object} titleEntity The LUIS title entity.
* @param {object} appointmentEntity An LUIS appointment entity.
* @param {string} attendees A list of attendees.
* @param {object} session A bot session.
* @returns {string} The title.
****************************************************************************/
function buildTitle(titleEntity, appointmentEntity, attendees, session)
{
  let title;

  if (titleEntity)
    title = titleEntity.entity;
  else if (attendees && attendees.length && appointmentEntity)
    title = `${appointmentEntity.entity} with ${attendees}`;
  else
    title = `Appointment with ${attendees}`;

  return title;
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

    return new Date(dateTime);
  }
}

module.exports = Calendar;