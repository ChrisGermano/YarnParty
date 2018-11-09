"use strict";

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Datastore = require('nedb'),
  db = new Datastore({ filename: 'userdata.db', autoload: true });

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

app.get('/', function(req,res) {
  res.sendFile(__dirname + '/index.html');
});

// =============================================================

function updateTimer() {

  if (gameData.secsLeft === 0) {

    gameData.secsLeft = gameData.resetTime;

    if (gameData.bank.length > 0) {

      var chosen = gameData.bank[Math.floor(Math.random() * gameData.bank.length)];
      gameData.bank = [];

      if (chosen.value === "#end") {

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

        var nextWord = gameData.nextTweet === "" ? chosen.value : ' ' + chosen.value;
        gameData.nextTweet += nextWord;

        let tmp = chosen.user;

        db.find({ _id : chosen.user }, function(err, docs) {
          if (err) {
            console.log(err);
          } else {
            if (docs.length === 0) {
              console.log("NO WINNER ASSOCIATED ERROR");
            } else {
              db.update({ _id : chosen.user }, { $set: { score : docs[0].score + 1 }, {}, function(err, docs) {
                console.log("UPDATED?");
                console.log(docs);
              })
            }
          }
        })

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

  socket.on('disconnect', function() {
    gameData.users--;
    io.emit('usercount',{ 'users' : gameData.users, 'servertime' : gameData.secsLeft });
  });

  socket.on('message', function(msg) {

    var firstWord = msg.value.split(' ')[0];
    var user = msg.user;

    db.find({ _id: user }, function(err, docs) {
      if (err) {
        console.log(err);
      } else if (docs.length === 0) {
        var tmpUsr = {
          _id : user,
          name : msg.name,
          score : 0
        }
        db.insert(tmpUsr, function(err2) {
          if (err2) {
            console.log(err2);
          }
        })
      }
    })

    gameData.bank.push({ value: firstWord, user: user });

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
