$(function(){
	chrome.storage.sync.get(['websites', 'creditAmt', 'bankAmt'], function({websites, bankAmt, creditAmt}){
		//Check to see if the current location is blacklisted 
		if(websites.find(website => window.location.host === website.name)) {
			$('body').append(
				`<div style="position:fixed;top:10px;width:100%;height:100px;padding:10px;background:lightgrey;border:1px solid #666;z-index:1000;opacity:.95;">
				<h3>Current balances</h3>
				<p>Available funds: $${bankAmt}</p>
				<p>Used credit: $${creditAmt.used} out of $${creditAmt.total}</p>
				</div>`);
		}
	});
});