"use strict";

const tConf = require('./config.js');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var sanitizeHtml = require('sanitize-html');
var Datastore = require('nedb'),
  db = new Datastore({ filename: 'userdata.db', autoload: true });

var Twit = require('twit');
const T = new Twit({
  consumer_key: tConf.data.consumer_key,
  consumer_secret: tConf.data.consumer_secret,
  access_token: tConf.data.access_token,
  access_token_secret: tConf.data.access_token_secret
});

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

// TODO / IDEAS
// Timestamp uuid, if not updated in a week(?), remove all instances in db
// Admin endpoints to easily handle user/data management without SSHing
// If the tweet is longer than one tweet's length, have it replied to itself as a chain

// =============================================================

app.use(express.static(__dirname + '/public'));

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
          io.emit('refresh', { 'data' : "Tweet cannot be empty :(" });
           return;
        }

        gameData.pastTweets.push(lastTweet);
        gameData.nextTweet = '';

        T.post('statuses/update', {status: lastTweet}, function(error, tweet, response) {
          if (error) console.log(error);
        });

        io.emit('refresh', { 'data' : "\"" + lastTweet + "\" was Tweeted!" });

        return;

      } else {

        var nextWord = gameData.nextTweet === "" ? chosen.value.charAt(0).toUpperCase() + chosen.value.slice(1) : ' ' + chosen.value;
        gameData.nextTweet += nextWord;

        db.find({ _id : chosen.user }, function(err, docs) {
          if (err) {
            console.log(err);
          } else {
            if (docs.length === 0) {
              console.log("NO WINNER ASSOCIATED ERROR");
            } else {
              db.update({ _id : chosen.user }, { $set: { score : docs[0].score + 1 }}, {}, function(err, docs) {

              })
            }
          }
        })

      }

    }

    db.find({}).sort({ score: -1 }).limit(3).exec(function (err, docs) {

      var scores = [];

      for (var u in docs) {
        scores.push[
          {
            name : docs[u].name,
            score : docs[u].score
          }
        ]
      }

      io.emit('refresh', { 'data' : gameData.nextTweet, 'scores' : docs });
    });

    return;

  } else {
    gameData.secsLeft--;
  }

}

setInterval(updateTimer, 1000);

io.on('connection', function(socket) {

  gameData.users++;

  io.emit('refresh', { 'data' : gameData.nextTweet });
  io.emit('userCount', { 'users' : gameData.users, 'servertime' : gameData.secsLeft });

  socket.on('disconnect', function() {
    gameData.users--;
    io.emit('userCount',{ 'users' : gameData.users, 'servertime' : gameData.secsLeft });
  });

  socket.on('message', function(msg) {

    var firstWord = msg.value.split(' ')[0];
    firstWord = sanitizeHtml(firstWord).toLowerCase().trim();

    if (firstWord == "") return;

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
  console.log("Let's start the Yarn Party!");
});


// connection - add to user count
// disconnect - subtract from user count
// addtowordpool -
