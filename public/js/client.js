$(function() {

  const maxTime = 10;
  var timer = maxTime;
  var blacklist = [];

  function nameGen() {

    if (window.localStorage.getItem('yarnparty_user') === null) {

      let possibleC = "BCDFGHJKLMNPQRSTVWXZ";
      let possibleV = "AEIOUY";

      function randomC() {
        return possibleC[Math.floor(Math.random() * possibleC.length)];
      }

      function randomV() {
        return possibleV[Math.floor(Math.random() * possibleV.length)];
      }

      let username = randomC() + randomV() + randomC() + randomC() + randomV();
      window.localStorage.setItem('yarnparty_user',username);
      return username;

    }

    return window.localStorage.getItem('yarnparty_user');

  }

  function uuid() {

    if (window.localStorage.getItem('yarnparty') === null) {
      let chunk = "";

      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
      }

      let tempID = s4() + "_" + s4() + "_" + s4() + "_" + s4();

      window.localStorage.setItem('yarnparty',tempID);
      return tempID;
    }

    return window.localStorage.getItem('yarnparty');
  }

  setInterval(function() {
    var timeText = timer === 0 ? " " + timer + " " : " "+timer+" ";
    $('.timeLeft').text(timeText);
    timer--;
    if (timer < 0) timer = 10;
  }, 1000);

  //=====================================================

  $('.username').text("Hi, " + nameGen());

  var socket = io();

  socket.on('refresh', function(groupText) {
    timer = maxTime;
    blacklist = [];
    $('.tweetText').text(groupText.data);
    $('.submissions').text('');
    $('.tweetLength').text(groupText.data.length);
    $('.lengthWarning').text('');

    $('.scores').empty();

    let scoreData = groupText.scores;

    for (var s in scoreData) {
      $('.scores').append("<div class='trophy"+s+"'><i></>" + scoreData[s].name + ": " + scoreData[s].score + "</div>");
    }
  });

  socket.on('message', function(msg) {

    let oldText = $('.groupText').text();

    msg = JSON.parse(msg);

    let newBank = "";

    for (var o in msg.bank) {
      newBank += msg.bank[o].value + " ";
    }

    newBank = newBank.slice(0, -1);

    $('.groupText').text(msg.nextTweet);
    $('.submissions').text(newBank);
  });

  socket.on('userCount', function(usercount) {

    let author = usercount.users > 1 ? "Authors" : "Author";

    $('.userCount').text(usercount.users + " " + author + " Connected");
    timer = usercount.servertime;
  })

  $('form').submit(function() {

    let formValue = $('#m').val();

    if (formValue == '') {
      return false;
    }

    let pastSubmits = blacklist;
    let newSubmit = formValue.toLowerCase().trim();

    for (var sub in pastSubmits) {
      if (newSubmit == pastSubmits[sub]) {
        $('#m').val('');
        $('.timeLeft').text('You can only submit the same word once!')
        return false;
      }
    }

    let currLength = parseInt($('#tweetLength').text());
    let newWord = parseInt(formValue.length);

    if (currLength + newWord > 280 && $('#m').val() !== "#end") {
      $('.lengthWarning').text('If \"' + formValue + '\" is chosen, it will exceed maximum length and be truncated');
    }

    socket.emit('message', { value: formValue, user: uuid(), name: nameGen() });

    var userSubs = $('#submissions').text();
    userSubs += ' ' + formValue;
    $('#submissions').text(userSubs);

    blacklist.push(formValue);

    $('#m').val('');
    return false;
  });

});
