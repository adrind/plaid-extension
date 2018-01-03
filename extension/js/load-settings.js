$(function(){
	$('.sign-up-btn').click(() => {
		chrome.tabs.create({url: 'index.html'});
	});	
});
