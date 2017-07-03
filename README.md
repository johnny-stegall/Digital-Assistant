# Digital-Assistant
A proof-of-concept for a digital assistant that can use Cortana or be independent using speech recognition, LUIS, and bots. It has intents/skills for manipulating calendars, searching for points-of-interest, and getting details about a point-of-interest.

## Configuration
The digital assistant is configured to run using environment variables, which can be supplied through a `.env` file. The `.env` file should look like this:

```
# Deployment Environment
nodeEnv=development
port=3978

# Dependency Injection
calendarApi=Google
mapApi=Google

# Bot details
appId=
appPassword=
botStateEndpoint=
botOpenIdMetadata=

# LUIS details
luisAppId=
luisApiKey=
luisAPIHostName=

# Map API credentials
googleDirectionsApiKey=
googleMapsApiKey=
googlePlacesApiKey=

# Google Application Credientials
googleClientId=
googleClientSecret=
googleProjectId=
```

# Dependencies
The digital assistant is using manual dependency injection for calendar and map APIs. Google calendar and Google maps have been implemented, if you wish to add others, such as Outlook and Bing Maps, create JavaScript classes that inherit map-api.js and calendar-api.js and implement the methods from those files.

## Create a Google Account and Get API Keys
1. Go to [Gmail](https://www.gmail.com) and create an account or sign into an existing one. Make sure to view your calendar. 
2. Go to the [Developer Console](https://console.developers.google.com) and create a project.
3. Create Credentials (from the left menu). Copy/paste the Client ID, Client Secret, and Project ID into the `.env` file.
4. Click *Enable* and select Google Calendar from G-Suite and enable the Google Calendar API.
5. Get an API key for the [Google Maps Directions API](https://developers.google.com/maps/documentation/directions/). Assign it to the project. Copy/paste the key into the `.env` file.
6. Get an API key for the [Google Maps API] (https://developers.google.com/maps/web-services/). Assign it to the project. Copy/paste the key into the `.env` file.
7. Get an API key for the [Google Places API] (https://developers.google.com/places/web-service/). Assign it to the project. Copy/paste the key into the `.env` file.

## Create a Microsoft Account
1. Create a [Microsoft account](https://account.microsoft.com/account) or sign into an existing one.

## Sign Up for Azure and Provision Services
1. Sign up for [Azure](https://azure.microsoft.com/en-us/) using your Microsoft account.
2. Go to the [Azure Portal[https://portal.azure.com].
3. Create a Resource Group.
4. Add a Web Service.
5. Add a Natural Language Service. Copy the API key.

## Sign up LUIS and Configure the Application
1. Sign up for the [Language Understanding Intelligent Service(LUIS](https://luis.ai) using your Microsoft account.
2. Import one of the LUIS applications: `Driver Assist (English).json`, `Driver Assist (Spanish).json`, or `Driver Assist (Japanese).json`.
3. Train the application.
4. Publish the application.
5. Add an API key. Paste the API key from the Natural Language Service.
6. Copy/paste just the host name (e.g. westus.api.cognitive.microsoft.com) from the LUIS endpoint into the `.env` file.

## Sign up for Cortana
1. Sign up for [Cortana](https://developer.microsoft.com/en-us/cortana/dashboard) using your Microsoft account.

## Sign up for Bot Framework
1. Sign up for the [Bot Framework](https://dev.botframework.com) using your Microsoft account.
2. Setup the API key and password. Copy/paste them into the `.env` file.
3. Go to Channels and add Cortana; fill out the form. Note that the Invocation you setup will be how you invoke your skill in Cortana. Scroll to the bottom, and under *Request user profile data* add `User.SemanticLocation.Current` and set *Friendly Name* to `CurrentLocation`. Save your changes.
4. Go to Settings and under *Speech recognition priming with LUIS* check the box next to the Driver Assist LUIS application you imported earlier. Save your changes.

## Get Google Credentials
1. You'll need [NodeJS](https://nodejs.org/en/download/) and the [Bot Framework Emulator](https://github.com/Microsoft/BotFramework-Emulator/releases) installed.
2. Execute the application and type an utterance into the Bot Framework Emulator that invokes Google Calendar (e.g. "Am I available today at noon?").
3. In the console, you'll be prompted to copy/paste a URL to enable the application you created with your Google account.
4. Enable the application with your Google account and copy/paste the credentials you're given back into the console. This creates the `google-credentials.json` file.

# Deploying the Application
You can deploy the code manually, or you can setup CI/CD and point directly to this GitHub repo. If you deploy manually, you'll need to use Visual Studio or FTP to push the files up to the web server. If you configure CI/CD, you'll need to manually copy the `google-credentials.json` and `.env` files.