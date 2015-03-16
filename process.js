///////////////////////////////////////
// Require statements
///////////////////////////////////////
var datagram = require('dgram');
var readline = require('readline');
var tty = require('tty');
var fs = require('fs');
var readline = require('readline');


if (process.argv.length != 4) {
  console.log("Usage: ./run <peer file> <port> <time>");
  process.exit(1);
}

var peerFileName = process.argv[2];
var listenerPort = parseInt(process.argv[3]);
var proposalTime = parseInt(process.argv[4]);
var ownIp;
var timeVotes = {};
var peers = [];
var peerSockets = {proposalTime: 1};
var maxVotes = 1;
var timeoutCount = 0;
var currentProposal;
var TIMEOUT_DURATION = 3;

// Retrieve own IP
require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  ownIp = add;
});

// Listen for proposals
serverSocket = datagram.createSocket('udp4');
serverSocket.bind(listenerPort);

serverSocket.on('message', function(msg) {
  console.log('received message');
  var tokens = tokenizeBySpaces(msg);
  handleProposal(tokens[0], tokens[1], tokens[2]);
});

readPeers(peerFileName);
sendTimeToPeers();

while(timeoutCount < 3) {
  setTimeout(function(){}, 1);
  sendTimeToPeers();
}

function readPeers(fileName) {
  var rd = readline.createInterface({
    input: fs.createReadStream(peerFileName),
    output: process.stdout,
    terminal: false
  });
  rd.on('line', function(line){
    var tokens = tokenizeBySpaces(line);
    if (tokens[0] != ownIp || tokens[1] != listenerPort) {
      var peerSocket = dgram.createSocket('udp4');
      peerSocket.bind(parseInt(tokens[1]));
      peers.push({
        'ip': tokens[0],
        'port': parseInt(tokens[1]),
        'time': parseInt(tokens[2]),
      });
      var ipPort = [tokens[0], tokens[1]];
      peerSockets.push({
        ipPort: peerSocket
      });
    }
  });
  setTimeout(handleTimeout, TIMEOUT_DURATION + 2);
}

function sendTimeToPeers() {
  for(var i=0; i<peers.length; ++i) {
    var msg = createMessage(ownIp, listenerPort, proposalTime);
    var peer = peers[i];
    peerSockets[[peer.ip, peer.port]].send(msg, 0, msg.length, peer.port, peer.ip);
  }
}

function handleTimeout() {
  if (currentProposal != proposalTime) {
    proposalTime = currentProposal;
    timeoutCount++;
    if (timeoutCount > 2) {
      console.log("Undecided");
    }
    setTimeout(handleTimeout, TIMEOUT_DURATION);
  } else {
    // proposal time settled. print
    console.log(proposalTime);
    timeoutCount = 3;
  }
}

function tokenizeBySpaces(string) {
  return string.split(' ');
}

function createMessage(ip, port, time) {
  return ip + ' ' + port + ' ' + time;
}

function handleProposal(fromIp, fromPort, time) {
  timeVotes[time]++;
  if (timeVotes[time] > maxVotes) {
    maxVotes = timeVotes[time];
    // Reset most popular time
    for (var key in timeVotes) {
      if (timeVotes[key] == maxVotes && timeVotes.hasOwnProperty(key)) {
        currentProposal = key;
      }
    }
  }
}

//Terminate if end of file is read from user input
process.stdin.on('end', function() {
  for (var socketObj in peers){
    socketPeers[socketObj.ip, socketObj.port].close();
  }
  serverSocket.close();
  process.exit(1);
});



