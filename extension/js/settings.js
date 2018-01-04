const PLAID_PUBLIC_KEY = '1d319beff108db2570ed3aeff9f5a1';

var plaidHandler = Plaid.create({
  apiVersion: 'v2',
  clientName: 'Shopping Savior Extension',
  env: 'sandbox',
  product: ['transactions'],
  key: PLAID_PUBLIC_KEY,
  onSuccess: function(publicToken) {
    $.post('http://localhost:8000/get_access_token', {
      public_token: publicToken
    }, function(response) {
      chrome.storage.sync.set({itemId: response.item});
      loadAccounts(response.item);
    });
  }
});

/*
 * Parse the hostname from the url the user wants to blacklist
 * @param {string} url - the URL to parse the hostname from
 */
const extractHostname = function(url) {
    //https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
    let hostname;

    //find & remove protocol (http, ftp, etc.) and get hostname
    if (url.indexOf("://") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];

    return hostname;
}

/*
 * Creates a HTML snippet of an account sent by the Plaid API
 * @param {object} account - an account returned by the Plaid API
 * @param {string} account.type - the type of account
 * @param {object} account.balances - the balance information about the account
 * @param {string} account.name - name of the account
 * @param {string} account.official_name - the official name of the account
 */
const createAccountHtml = function({type, balances, name, official_name}) {
  var accountType = type === 'credit' ? 'credit_card' : 'account_balance',
      color = type === 'credit' ? 'purple': 'green',
      balance = balances.available || balances.current,
      showProgress = type === 'credit' ? '' : 'hide';

  if(balances.limit) {
    var progressBar = (balance / balances.limit) * 100;
  }
  return `
    <li class="collection-item avatar">
      <i class="material-icons circle ${color}">${accountType}</i>
      <p class="title">${name}</p>
      <p class="text-grey">${official_name}</p>
      <p>Balance on this account: $${balance}</p>
      <div class="progress ${showProgress}">
        <div class="determinate" style="width: ${progressBar}%"></div>
      </div>
    </li>
  `
};

/* 
 * Creates an HTML snippet of a new website a user wants to blacklist
 * @param {object} website - the website the user wants to blacklist
 * @param {string} website.name - the parsed hostname of the website
 */
const createSiteHtml = function({name}) {
  return `
    <li class="collection-item avatar" data-name=${name}>
      <i class="material-icons circle">shopping_cart</i>
      <p class="title">${name}</p>
      <a href="#!" class="secondary-content"><i class="material-icons delete-website">delete_forever
</i></a>
    </li>
  `
};

/*
 * Removes a website from the blacklist
 * @param {string} name - the hostname of the website to remove
 * @param {object} $target - the element to remove after website is successfully deleted
 */
const deleteWebsite = function(name, $target) {
  chrome.storage.sync.get('websites', function({websites}){
    var index = websites.findIndex(website => website.name === name);
    websites.splice(index, 1);

    chrome.storage.sync.set({'websites': websites}, () => {$target.remove();});
  });
};

/* 
 * Runs on page load or after a user links their accounts
 * @param {string} itemId - the id of the users accounts from an institution
 */
const loadAccounts = function(itemId) {
  let $loaderSection = $('.loader-section'),
      $accountsSection = $('.accounts-section');

  $loaderSection.removeClass('hide');
  $accountsSection.hide();

  //Get the accounts for the user
  $.get(`http://localhost:8000/accounts?item=${itemId}`).done(({accounts=[]})=>{
    let bankAmt = 0,
        creditAmt = {used: 0, total: 0},
        $accountList = $('.bank-collection'),
        balances = [];
    $loaderSection.addClass('hide');
    $('.connect-btn').hide();
    $accountsSection.show();
    $accountList.show();
    accounts.forEach(account => {
      let balance = account.balances.available || account.balances.limit - account.balances.current;
      
      //Add HTML for each account and store balances
      $accountList.append(createAccountHtml(account));
      balances.push({name: account.name, balance: balance});

      //Compute overall available balances
      if (account.type === 'depository' && account.balances.available) {
        //Ignores CD accounts for now
        bankAmt += account.balances.available;              
      }

      if (account.type === 'credit') {
        creditAmt.total += account.balances.limit;
        creditAmt.used += account.balances.current;
      }
    });
    chrome.storage.sync.set({'balances': balances, 'bankAmt': bankAmt, 'creditAmt': creditAmt});
  });  
};

/*
 * Add a new website to the blacklist
 */
const addWebsite = function() {
  let $input = $('input[name=blacklist-website]');
  $('.website-collection').show();
  chrome.storage.sync.get('websites', function({websites=[]}){
    let value = extractHostname($input.val());
    websites.push({name: value});

    chrome.storage.sync.set({'websites': websites}, () => {
      let $collection = $('.website-collection').append(createSiteHtml({name: value}))
      let $newItem = $collection.find(`li[data-name="${value}"]`)[0];
      $('.delete-website', $newItem).click(()=>{ deleteWebsite(name, $newItem); });
    });
    //Clear the blacklisted input
    $input.val('');
  });
};

/* 
 * Runs on page load
 * Sets up account and website list if user has already linked and/or added data
 */
const loadSettings = function() {
  chrome.storage.sync.get(['itemId', 'websites'], function({itemId, websites}){
    let $websiteList = $('.website-collection'),
        $accountList = $('.bank-collection');

    //Check to see if user has already linked their accounts
    if (itemId) {
      loadAccounts(itemId);
    } else {
      //Prompt the user to connect their accounts with Plaid
      $websiteList.hide();
      $accountList.hide();
      $('.accounts-description').show();
      $('.connect-btn').click(() => { plaidHandler.open();});      
    }

    if (websites && websites.length) {
      websites.forEach(website => {
        //Add HTML for each blacklisted website
        $websiteList.append(createSiteHtml(website));
      });

      $('.delete-website').click(evt => {
        let $target = $(evt.target).parents('li');
        deleteWebsite($('.title', $target).text(), $target);
      });
    } else {
      $websiteList.hide();
    }
  });

  $('.blacklist-website-btn').click(addWebsite);
  $('input[name="blacklist-website"]').keypress(evt => {
    if (evt.keyCode === 13) {
      addWebsite();
    }
  });  
}

/* 
 * Script run on page load
 */
$(loadSettings)
