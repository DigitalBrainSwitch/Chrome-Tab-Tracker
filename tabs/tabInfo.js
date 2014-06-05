var completedSessions = new Array();
var activeSessions = new Array();
var prevSes = 0;
var lastSwitchTime;
var inFocus = true;
var userID = null;
var paused = false;

//Creates a new session and adds it to activeSessions array
function createSession(tab){
	if(!paused){
		prevSes = activeSessions.length;
		lastSwitchTime = new Date();
		var session = {
			tabID : tab['id'],
			windowID : tab['windowId'],
			startTime : new Date(),
			endTime : null,
			activeTime : 0,
			switches : 0,
			closed : false,
			url : convertURL(tab['url'])
		}
		activeSessions.push(session);
	}
}

//Closes a session and posts to the database.
function closeSession(id){
	for(i = 0; i < activeSessions.length; i++){
		if(activeSessions[i]['tabID']==id && !activeSessions[i]['closed']){
			d = new Date();
			activeSessions[i]['endTime'] = d;
			activeSessions[i]['activeTime'] += Math.abs(d - lastSwitchTime);
			activeSessions[i]['closed'] = true;
			postSession(activeSessions[i]);
			completedSessions.push(activeSessions[i]);
			activeSessions.splice(i,1);
		}
	}
}


//Changes full url to domain
function convertURL(url){
	var res = url.split("/");
	return res[2];
}

//Sends session information to database
//Called every time a session is closed.
function postSession(session){
	if(userID!=null && session['url']!=""){
		$.post("http://digitalbrain-test.lancs.ac.uk/wp-includes/chrome-extension/save.php", { user_id: userID, start: ISODateString(session['startTime']), end: ISODateString(session['endTime']), switches:session['switches'], time:session['activeTime'], url:session['url']}, function() {});
	}
}

//When a user pauses, end all current sessions
//& stop tracking any session information.
function pause(){
	paused = true;
	chrome.browserAction.setIcon({path:'icon_grey.png'}); 
	for(i = 0; i < activeSessions.length; i++){
		closeSession(activeSessions[i]['tabID']);
	}
}

//Convert date for mySQL
function ISODateString(d){
  function pad(n){return n<10 ? '0'+n : n}
  return d.getUTCFullYear()+'-'
      + pad(d.getUTCMonth()+1)+'-'
      + pad(d.getUTCDate()) +' '
      + pad(d.getUTCHours())+':'
      + pad(d.getUTCMinutes())+':'
      + pad(d.getUTCSeconds())
}


/*
* Record switch to session, and time spent on previous session
*/
chrome.tabs.onActivated.addListener(function (activeTab){
	for(i = 0; i < activeSessions.length; i++){
		if(activeSessions[i]['tabID']==activeTab['tabId']){
			activeSessions[i]['switches']++;
			d = new Date();
			if(activeSessions[prevSes]!=undefined){
				activeSessions[prevSes]['activeTime'] += Math.abs(d - lastSwitchTime);
			}
			lastSwitchTime = d;
			prevSes = i;
		}
	}
});


/*
* If the domain on a tab has changed then close the previous session
* then start the new session. If it is a new tab, then start a new session 
*/
chrome.tabs.onUpdated.addListener(function (id, changeInfo, tab){
	newTab = true;
	if(changeInfo['status']=='complete'){
		for(i = 0; i < activeSessions.length; i++){
			if(activeSessions[i]['tabID']==id){
				newTab = false;
				if(activeSessions[i]['url']!=convertURL(tab['url'])){
					//URL has changed
					closeSession(id);
					createSession(tab);
				}
				else{
					//URL hasn't changed, update active time
					d = new Date();
					activeSessions[i]['activeTime'] += Math.abs(d - lastSwitchTime);
					lastSwitchTime = d;
				}
			}
		}
		if(newTab && convertURL(tab['url'])!='newtab'){
			createSession(tab);
		}
	}
});


/*
* Close session when tab is closed.
*/
chrome.tabs.onRemoved.addListener(function (id){
	closeSession(id);
});


/*
* Update tab's id if it changes mid-session
*/
chrome.tabs.onReplaced.addListener(function (newID, oldID){
	for(i = 0; i < activeSessions.length; i++){
		if(activeSessions[i]['tabID']==oldID){
			activeSessions[i]['tabID'] = newID;
		}
	}
});

/*
* Close sessions for all tabs in a window
* when the window is closed.
*/
chrome.windows.onRemoved.addListener(function (windowID){
	for(i = 0; i < activeSessions.length; i++){
		if(activeSessions[i]['windowID']==windowID){
			closeSession(activeSessions[i]['id']);
		}
	}
});

/*
* Don't record active time if the browser is not in focus
*/
chrome.windows.onFocusChanged.addListener(function (windowID){
	if(windowID == chrome.windows.WINDOW_ID_NONE) {
		inFocus = false;
	}
	else{
		if(!inFocus){
			lastSwitchTime = new Date();
			inFocus = true;
		}
	}
});


//Get user authentication cookie 
document.addEventListener('DOMContentLoaded', function () {
	chrome.cookies.getAll({name:'DBS_Extension'},function (cookie){
		if(cookie.length!=0){
			WP_Cookie = cookie[0]['value'].split('%3A%3A');
	        userID = WP_Cookie[0];
	       chrome.storage.sync.set({'cookie': WP_Cookie}, function() {});
		}
	});
 	chrome.storage.sync.get('cookie', function(store) {
		userID = store['cookie'][0];
 	});
});


chrome.runtime.onMessage.addListener(function(request,sender,sendResponse) {

	if (request.message == "pause"){
		pause();
	}
	if (request.message == "unpause"){
		if(userID!=null){
			paused=false;
			chrome.browserAction.setIcon({path:'icon.png'});
		}
	}
	if (request.message == "pause status"){
		sendResponse({paused: paused}); 
	}

	if (request.message == "new cookie"){
		chrome.storage.sync.get('cookie', function(store) {
			if(userID != store['cookie'][0]){
				paused=false;
				chrome.browserAction.setIcon({path:'icon.png'});
			}
			userID = store['cookie'][0];
 		});
	}
	if (request.message == "no cookie"){
		userID = null;
		pause(); 
	}
});