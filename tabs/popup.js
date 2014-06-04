var WP_Cookie = null;
var WP_Username = null;
var allSessions = null;
var WP_UserID = null;
var paused = false;


document.addEventListener('DOMContentLoaded', function () {
  refreshCookie();
  chrome.storage.sync.get('cookie', function(cookie) {
    WP_Cookie = cookie['cookie'];
    getSessions('today');  
  });
  chrome.runtime.sendMessage({message: "pause status"}, function(response) {
    if(response.paused){
      $('#pause').html('Resume Logging');
    } 
  });          
});

//Checks if user is logged in on wordpress.
function refreshCookie(){
  chrome.cookies.getAll({name:'DBS_Extension'},function (cookie){
    if(cookie.length!=0){
      WP_Cookie = cookie[0]['value'].split('%3A%3A');
      WP_UserID = WP_Cookie[0];
      WP_Username = WP_Cookie[1];
      $('#welcome').html('Welcome, ' + WP_Username);
      chrome.storage.sync.set({'cookie': WP_Cookie}, function() {
         chrome.runtime.sendMessage({message: "new cookie"}, function(response) {});
      });
    }
    else{
      $('#welcome').html('Please <a href="http://localhost">login/register</a>');
      WP_UserID = null;
      WP_Username = null;
      chrome.runtime.sendMessage({message: "no cookie"}, function(response) {});
    }
  });
}

//Calls get.php to return matching sessions for user and type (day/yesterday/week)
function getSessions(type){
  $.post("http://localhost/wp-includes/chrome-extension/get.php", {user_id: WP_UserID, type: type}, function(response) {
      allSessions = JSON.parse(response);
      console.log(allSessions);
      mergeSessions();
  });
}

//Groups sessions by domain and works out sum of active time and switches.
function mergeSessions(){
  allSites = new Array();
  for(i = 0; i<allSessions.length; i++){
    newSite = true;
    for(j = 0; j<allSites.length; j++){
      if(allSessions[i]['url']==allSites[j]['url']){
        allSites[j]['switches'] += parseInt(allSessions[i]['switches']);
        allSites[j]['totalTime'] += parseInt(allSessions[i]['active_time']);
        allSites[j]['sessionCount'] ++;
        newSite = false;
      } 
    }
    if(newSite){
      var site = {
        url: allSessions[i]['url'],
        switches: parseInt(allSessions[i]['switches']),
        totalTime: parseInt(allSessions[i]['active_time']),
        sessionCount: 1
      }
      allSites.push(site);
    }
  }
  allSites.sort(function(a, b){
    return b.totalTime-a.totalTime;
  });
  displaySites();
}

//Prints out merged data onto extension popup
function displaySites(){
  $('#info').empty();
  $('#info').append('<table id="websites"><tr><th class="left">Website</th><th>Switches</th><th>Time spent</th><th>Tabs Opened</th></tr></table>');
  for (var i = 0; i < allSites.length; i++) {
    $('#websites').append('<tr><td class="left">' + allSites[i]['url'] + '</td><td>' + allSites[i]['switches'] + '</td><td>' +   millisToDaysHoursMinutes(allSites[i]['totalTime']) + '</td><td>' + allSites[i]['sessionCount']+'</td></tr>' );
  }
}

//for formatting ms
function millisToDaysHoursMinutes(A) {
  var seconds=(A/1000)%60;
  var minutes=(A/(1000*60))%60;
  var hours=(A/(1000*60*60))%24;
  return hours.toFixed(0) + ":" + ('0' + minutes.toFixed(0)).slice(-2) + ":" + ('0' + seconds.toFixed(0)).slice(-2);
}



$( "#today" ).on( "click", function() {
  getSessions('today');
});
$( "#yesterday" ).on( "click", function() {
  getSessions('yesterday');
});
$( "#week" ).on( "click", function() {
  getSessions('week');
});


//Handles pausing and unpausing
$( "#pause" ).on( "click", function() {
  chrome.runtime.sendMessage({message: "pause status"}, function(response) {
    console.log(response.paused);
    if(response.paused){
       chrome.runtime.sendMessage({message: "unpause"}, function(response) {});
      $('#pause').html('Pause Logging');
    } 
    else{
      chrome.runtime.sendMessage({message: "pause"}, function(response) {});
      $('#pause').html('Resume Logging');
    }
  });
});
