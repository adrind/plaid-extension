# Stop Shopping Extension
A quick proof of concept Chrome Extension to discourage people from online shopping by throwing their current financial situation in their face.

## Overview
This extension allows a user to link a financial institution and input a list of websites that they frequently online shop at. While this extension is enabled, we'll show them a simple popup reminding them how much is currently in their bank account/how much debt they have on their credit cards.
[Demo of the extension](https://drive.google.com/file/d/1n7vMmDdouv_WKyl9rl4VvcLgaDlejBJ5/view?usp=sharing)

## Quick Start
The extension code lies in the extension folder. To upload the extension:
1. Open the Extensions view in Chrome
2. Select "Load unpacked extension"
3. Select the extension folder in the plaid-extension repo
4. Develop!

The backend server is a simple node app that makes requests to Plaid's API. It uses a basic postgres db to keep track of users who link their accounts. Before you start the server it expects a .env file in the `node` repo with your developer information:

**example .env file**
```
APP_PORT=8000
PLAID_CLIENT_ID=<your-plaid-client-id>
PLAID_SECRET=<your-plaid-secret-key>
PLAID_PUBLIC_KEY=<your-plaid-public-key>
PLAID_ENV=sandbox

PGHOST='localhost'
PGUSER=<some-user>
PGDATABASE=<some-db>
PGPASSWORD=<some-password-if-needed>
PGPORT=5432

```

After you've configured your settings run `npm install` and then `node index.js`

## Extra Resources

* [Chrome Extension Developer Guides](https://developer.chrome.com/extensions/devguide)
* [Plaid API Documentation](https://plaid.com/docs/api/)
* [Materialize CSS](https://materializecss.com)
