$(function(){
	chrome.storage.sync.get(['websites', 'creditAmt', 'bankAmt'], function({websites, bankAmt, creditAmt}){
		//Check to see if the current location is blacklisted 
		if(websites.find(website => window.location.host === website.name)) {
			let imgUrl = chrome.runtime.getURL('images/piggy_bank.png');

			//Warn the user with a red color if they're getting close to their limit
			let circleColor = (creditAmt.used / creditAmt.total) > .65 ? '#EC5D57' : '#48BF84';
			$('body').append(
				`<div id="shopping-sos-container">
				<div id="shopping-sos-flex">
				<div>
				<h3 class="shopping-sos-h3">Credit Usage</h3>
				<div id="shopping-sos-credit-bar"></div>
				<p class="shopping-sos-p">You have used $${creditAmt.used} out of your $${creditAmt.total} limit.</p>
				</div>
				<div class="shopping-sos-flex-item">
				<h3 class="shopping-sos-h3">Bank</h3>
				<img src="${imgUrl}" alt="Piggy Bank" id="shopping-sos-img" />
				<p class="shopping-sos-p">You have $${bankAmt} in the bank.</p>
				</div>`);

			let semiCircle = new ProgressBar.SemiCircle('#shopping-sos-credit-bar', {
			  strokeWidth: 6,
			  easing: 'easeInOut',
			  duration: 1400,
			  color: circleColor,
			  trailColor: '#333',
			  trailWidth: 1,
			  text: {
    			alignToBottom: false,
    			value: '',
			  },
			  svgStyle: null,
			  step: function(state, bar) {
			  	let value = Math.round(bar.value() * 100);
			  	if(value) {
			  		bar.setText(`${value}%`);
			  	} else {
			  		bar.setText('')
			  	}
			  }
			});

			Object.assign(semiCircle.text.style, {
				fontFamily: '"Raleway", Helvetica, sans-serif',
				fontSize: '1.5rem',
				top: '0px'
			});
			
			semiCircle.animate(creditAmt.used/creditAmt.total);  // Number from 0.0 to 1.0
		}
	});
});