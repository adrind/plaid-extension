'use strict';

var dotenv = require('dotenv').config();
var envvar = require('envvar');
var express = require('express');
var bodyParser = require('body-parser');
var moment = require('moment');
var plaid = require('plaid');
const { Pool, Client } = require('pg');
const pool = new Pool()

var APP_PORT = process.env.APP_PORT;
var PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
var PLAID_SECRET = process.env.PLAID_SECRET;
var PLAID_PUBLIC_KEY = process.env.PLAID_PUBLIC_KEY;
var PLAID_ENV = process.env.PLAID_ENV;

// We store the access_token in memory - in production, store it in a secure
// persistent data store
var PUBLIC_TOKEN = null;

const insertText = 'INSERT INTO plaid(item_id, access_token) VALUES($1, $2) RETURNING *'
const lookupText = 'SELECT * FROM plaid WHERE item_id=$1';


// Initialize the Plaid client
var client = new plaid.Client(
  PLAID_CLIENT_ID,
  PLAID_SECRET,
  PLAID_PUBLIC_KEY,
  plaid.environments[PLAID_ENV]
);

var app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

app.get('/', function(request, response, next) {
  response.render('index.ejs', {
    PLAID_PUBLIC_KEY: PLAID_PUBLIC_KEY,
    PLAID_ENV: PLAID_ENV,
  });
});

app.post('/get_access_token', function(request, response, next) {
  PUBLIC_TOKEN = request.body.public_token;
  client.exchangePublicToken(PUBLIC_TOKEN, function(error, tokenResponse) {
    if (error != null) {
      var msg = 'Could not exchange public_token!';
      console.log(msg + '\n' + error);
      return response.json({
        error: msg
      });
    }

    console.log('Access Token: ' + tokenResponse.access_token);
    console.log('Item ID: ' + tokenResponse.item_id);
    pool.query(insertText, [tokenResponse.item_id, tokenResponse.access_token], (err, res) => {
      if (err) {
        console.log(err.stack)
      } else {
        console.log(res.rows[0])
        // { name: 'brianc', email: 'brian.m.carlson@gmail.com' }
      }
    })
    response.json({
      'item': tokenResponse.item_id
    });
  });
});

app.get('/accounts', function(request, response, next) {
  var itemId = request.query.item;
  console.log('item is',itemId);
  pool.query(lookupText, [itemId]).then(res => {
    var access_token = res.rows[0].access_token
    client.getAuth(access_token, function(error, authResponse) {
      if (error != null) {
        var msg = 'Unable to pull accounts from the Plaid API.';
        console.log(msg + '\n' + error);
        return response.json({
          error: msg
        });
      }

      console.log(authResponse.accounts);
      response.json({
        error: false,
        accounts: authResponse.accounts,
        numbers: authResponse.numbers,
      });
    });
  }).catch(e => console.error(e.stack))
});

app.post('/item', function(request, response, next) {
  // Pull the Item - this includes information about available products,
  // billed products, webhook information, and more.
  client.getItem(ACCESS_TOKEN, function(error, itemResponse) {
    if (error != null) {
      console.log(JSON.stringify(error));
      return response.json({
        error: error
      });
    }

    // Also pull information about the institution
    client.getInstitutionById(itemResponse.item.institution_id, function(err, instRes) {
      if (err != null) {
        var msg = 'Unable to pull institution information from the Plaid API.';
        console.log(msg + '\n' + error);
        return response.json({
          error: msg
        });
      } else {
        response.json({
          item: itemResponse.item,
          institution: instRes.institution,
        });
      }
    });
  });
});

app.post('/transactions', function(request, response, next) {
  // Pull transactions for the Item for the last 30 days
  var startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
  var endDate = moment().format('YYYY-MM-DD');
  client.getTransactions(ACCESS_TOKEN, startDate, endDate, {
    count: 250,
    offset: 0,
  }, function(error, transactionsResponse) {
    if (error != null) {
      console.log(JSON.stringify(error));
      return response.json({
        error: error
      });
    }
    console.log('pulled ' + transactionsResponse.transactions.length + ' transactions');
    response.json(transactionsResponse);
  });
});

var server = app.listen(APP_PORT, function() {
  console.log('plaid-walkthrough server listening on port ' + APP_PORT);
});
