"use strict";

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uniqid = require('uniqid');

// On user connection, generate uniqid, send to user
// User stores in local storage and submits words with attached id
// Chosen word is returned with id, if matches user, update score
// Upon choosing a word, save point with ID

// Every time a word is chosen, save ID + word + timestamp to table

const DEBUG = 1;
const COUNTDOWN = 10;

let connections = {};

let gameData = {
  'users' : 0,
  'bank' : [],
  'secsLeft' : COUNTDOWN,
  'resetTime' : COUNTDOWN,
  'nextTweet' : "",
  'pastTweets' : []
}

// =============================================================

class Submission {
  constructor (word, userID) {
    this.word = word;
    this.userID = userID;
  }
}

// =============================================================

app.get('/', function(req,res) {
  res.sendFile(__dirname + '/index.html');
});

// =============================================================

function updateTimer() {

  if (gameData.secsLeft === 0) {
    //gameData.pastTweets.push(gameData.nextTweet);
    //gameData.nextTweet = "";
    gameData.secsLeft = gameData.resetTime;

    if (gameData.bank.length > 0) {

      var chosen = gameData.bank[Math.floor(Math.random() * gameData.bank.length)];
      gameData.bank = [];

      if (chosen === "#end") {

        var lastTweet = gameData.nextTweet;

        if (lastTweet === "") {
          io.emit('refresh', { 'data' : "Tweet cannot be empty" });
           return;
        }

        console.log("Posting to Twitter: \"" + lastTweet + "\"");
        gameData.pastTweets.push(lastTweet);
        gameData.nextTweet = '';

        io.emit('refresh', { 'data' : "\"" + lastTweet + "\" was Tweeted!" });

        return;

      } else {

        var nextWord = gameData.nextTweet === "" ? chosen : ' ' + chosen;
        gameData.nextTweet += nextWord;

      }

    }

    if (DEBUG) {
      console.log(gameData);
    }

    io.emit('refresh', { 'data' : gameData.nextTweet });

    return;

  } else {
    gameData.secsLeft--;
  }

}

setInterval(updateTimer, 1000);

io.on('connection', function(socket) {

  gameData.users++;

  io.emit('usercount', { 'users' : gameData.users, 'servertime' : gameData.secsLeft });

  socket.on('data', function(data) {
    //TODO: Unique user IDs for attributing points
    console.log(uniqid());
    connections[uniqid()] = { client : socket.id };
  });

  socket.on('disconnect', function() {
    gameData.users--;
    io.emit('usercount',{ 'users' : gameData.users, 'servertime' : gameData.secsLeft });
  });

  socket.on('message', function(msg) {

    var firstWord = msg.split(' ')[0];

    gameData.bank.push(firstWord);

    var wordUpdate = {
      'word' : firstWord,
      'bank' : gameData.bank,
      'nextTweet' : gameData.nextTweet
    }

    io.emit('message', JSON.stringify(wordUpdate));
  });

});

http.listen(3000, function() {
  console.log('listening on *:3000');
});


// connection - add to user count
// disconnect - subtract from user count
// addtowordpool -
