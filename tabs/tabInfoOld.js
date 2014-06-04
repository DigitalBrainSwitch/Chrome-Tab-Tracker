var allSites = new Array();
var tabCount = 0;
var totalTabCount = 0;
var totalSwitches;
var lastSiteIndex = null;
var lastSwitchTime = new Date();
var lastSwitchURL;
var active = true;


/**When link is updated in a tab
* Find out the domain then log it
*/
chrome.tabs.onUpdated.addListener(function (id, url, updatedTab){
	if(updatedTab['url']!='chrome://newtab/'){
		if(updatedTab['status']=='complete'){
			//window.alert('update: ' + updatedTab['url']);
			var url = updatedTab['url'];
			var res = url.split("/");
			//don't record a switch if page change on same domain
			if (res[2]!=lastSwitchURL&&res[2]!='devtools'){
				logTab(res[2], updatedTab['id']);
			}
		}
	}
});


/** When we switch tabs
* Find out the domain and log it
*/
chrome.tabs.onActivated.addListener(function (activeTab){
	chrome.tabs.get(activeTab['tabId'], function(currentTab){
		if(currentTab['url']!='chrome://newtab/'){
			//window.alert('switch: ' + currentTab['url']);
			var url = currentTab['url'];
			var res = url.split("/");
			//don't record a switch if page change on same domain
			if (res[2]!=lastSwitchURL&&res[2]!='devtools'){
				logTab(res[2], currentTab['id']);
			}
		}
	});
});


//Increment tab count
chrome.tabs.onCreated.addListener(function (activeTab){
	active = true;
	tabCount++;
	totalTabCount++;
});


//Decrement tab count
chrome.tabs.onRemoved.addListener(function (activeTab){
	tabCount--;
	closeSite(activeTab);
});


//when a tab is created or the url changes
function logTab(url, id){
	lastSwitchURL = url;
	if(allSites[lastSiteIndex]!=undefined&&checkActivity()){
		//work out how long spent on tab.
		var d = new Date();
		diff = Math.abs(d - lastSwitchTime);
		allSites[lastSiteIndex]['timeOnSite'] += diff;
	}
	//check if we have already logged this site
	exists = false;
	for (var i = 0; i < allSites.length; i++) {
		if(allSites[i]['url']==url){
			lastSiteIndex = i;
			exists = true;
			allSites[i]['switches']++;
			totalSwitches++;
			idExists = false;
			//log the tabid 
			for(var j = 0; j < allSites[i]['tabIDs'].length; j++){
				if(allSites[i]['tabIDs'][j]==id){
					idExists = true;
				}
			}
			if(idExists == false){
				allSites[i]['tabIDs'].push(id);
			}
		}
	}
	if (exists == false){
		addSite(url, id);
	}
	sendStats();
	lastSwitchTime = new Date();
}

/**
* Log start time of when websites are opened
* Stored by domain instead of by tab
* (in case website open in multiple tabs)
*/
function addSite(url, id){
	var d = new Date();
	var date = d.toDateString();
	var time = d.toTimeString();
	var site = {
		url: url,
		startTime: date + ' ' + time,
		switches: 0,
		endTime: null,
		tabIDs: [id],
		timeOnSite: 0
	}
	//Add site to allSites array
	allSites.push(site);
	lastSiteIndex = allSites.length-1; //used for working out time on site
}

/**
* When a tab is closed
* remove tab id from the site
*/
function closeSite(id){
	var count = 0;
	var site;
	for (var i = 0; i < allSites.length; i++) {
		for(var j = 0; j < allSites[i]['tabIDs'].length; j++){
			if(allSites[i]['tabIDs'][j]==id){
				count = allSites[i]['tabIDs'].length;
				allSites[i]['tabIDs'].splice(j, 1);
				site = i;
			}
		}
	}
	//if it is last tab with site open
	//record the end time
	if (count == 1){
		var d = new Date();
		var date = d.toDateString();
		var time = d.toTimeString();
		allSites[site]['endTime'] = date + ' ' + time;
	}
}


/*
* Checks if user has been active in last 30 mins
*/
function checkActivity(){
	var d = new Date();
	diff = Math.abs(d - lastSwitchTime);
	if (diff>1800000){
		return false;
	}
	else return true;
}

//put allSites into 'sync' storage
function sendStats(){
	chrome.storage.sync.set({'allSites': allSites}, function() {});
	chrome.storage.sync.set({'switchCount': totalSwitches}, function() {});
}


chrome.runtime.onMessage.addListener(function(request) {
	//remove sites from local storage and reset this script
	if (request.message == "clearData"){
		allSites = new Array();
		tabCount = 0;
		totalTabCount = 0;
		totalSwitches = 0;
		lastSiteIndex = null;
		lastSwitchTime = new Date();
		lastSwitchURL = null;
		chrome.storage.sync.remove('allSites', function() {
			chrome.storage.sync.set({'allSites': allSites}, function() {});
		});
	}
	//remove one site from local storage.
	if (request.removeSite){
		allSites.splice(request.removeSite, 1);
		chrome.storage.sync.set({'allSites': allSites}, function() {});
		console.log('removed');
	}
});

//Reload previous data from 'sync' storage
document.addEventListener('DOMContentLoaded', function () {
 	chrome.storage.sync.get('allSites', function(sites) {
		allSites = sites['allSites'];
 	});
 	chrome.storage.sync.get('switchCount', function(sites) {
		totalSwitches = sites['switchCount'];
 	});
});