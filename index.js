/*
Nodejs Chat Application w/ Socketio
Brandon Lu

Desc
  A simple implementation of a nodejs chat application 
  Uses somewhat inefficient means for server-client communications with redundant sockets, can be
  improved with a bit more time spent refactoring.
*/

var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
var cookieparser = require("cookie-parser");
app.use(cookieparser());

app.use(express.static("public"));

http.listen(3000, function() {
  console.log("listening on *:3000");
});

/*
array.remove(array, element) functionality
Source: https://stackoverflow.com/questions/5767325/how-to-remove-specific-item-from-array
*/
function removeelem(array, element) {
  const index = array.indexOf(element);
  if (index > -1) {
    array.splice(index, 1);
  }
}

/*
Modified version of array.remove to find specific elements
*/
function findelem(array, element) {
  const index = array.indexOf(element);
  if (index > -1) {
    return 1;
  } else {
    return 0;
  }
}

let userlist = [];
let chathistory = [];

io.on("connection", function(socket) {

  // Debugging remote connecitons to the server - print out the client ip address
  var clientIpAddress =
    socket.request.headers["x-forwarded-for"] ||
    socket.request.connection.remoteAddress;
  console.log("New request from : " + clientIpAddress);

  //res.cookie('name', socket.username).send('cookie set'); //Sets name = express

  let newconn = true;

  /*
  Adds the user to the list of currently connected users to the server
  On new user connection, will also emit a message to all sockets to update their user list
  to find the new user connection
  */
  function createuser(username) {
    if (!newconn) {
      // return a message - existing conn?
      return;
    } else {
      if (findelem(userlist, username) === 1) {
        console.log("This user already exists");
        socket.emit("user exists");
      } else {
        socket.emit("user connected");
        socket.username = username;
        newconn = false;
        userlist.push(username);
        io.emit("update userlist", userlist);
        console.log(
          clientIpAddress + " assigned identity of " + socket.username
        );
      }
    }
  }

  // Socket event for creating the user
  socket.on("add user", function(data) {
    createuser(data.username);
  });

  /*
  Socket event to handle disconnections.
  Removes the currently connected user from the list of users and tells all clients to update
  their list of users
  */
  socket.on("disconnect", function() {
    console.log(socket.username + " disconnected");
    removeelem(userlist, socket.username);
    //remove user from db
    // now update to users
    io.emit("update userlist", userlist);
  });

  // Debug event for finding when a user reconnects
  socket.on("reconnect event", username => {
    console.log(socket.username + " reconnected");
  });

  /*
  Received a chat message request
  Format the client information and log the message to the chat history
  Send the request out to all users
  */
  socket.on("chat message", function(data) {
    let d = new Date();
    let time =
      d.getHours() +
      ":" +
      ("0" + (d.getMinutes() + 1)).slice(-2) +
      ":" +
      ("0" + (d.getSeconds() + 1)).slice(-2);
    console.log(time + " " + data.sender + " : " + data.message);
    io.emit("chat message", {
      message: data.message,
      sender: data.sender,
      timestamp: time,
      nickcolor: data.nickcolor
    });

    chathistory.push({
      message: data.message,
      sender: data.sender,
      timestamp: time,
      nickcolor: data.nickcolor
    });

    /*
    if (chathistory.length <= 200) {
      chathistory.push({message : data.message, sender : data.sender, timestamp : time, nickcolor: data.nickcolor});
    } else {
      chathistory.splice(0, 1);
      chathistory.push({message : data.message, sender : data.sender, timestamp : time, nickcolor: data.nickcolor});
    }
    */

    //console.log(chathistory);

    //console.log('Current list of connected users: ');
    //for (let i = 0; i < userlist.length; i++) {
    //  console.log(userlist[i]);
    //}
  });

  /*
  On request for new nickname, check if the new nickname requested exists
  If it exists, we flag the request and tell the user they will need to change the nickanme
  Otherwise, we update the nickname and refresh the user list for all clients
  */
  socket.on("new nickname", newusername => {
    if (findelem(userlist, newusername)) {
      socket.emit("user exists");
    } else {
      removeelem(userlist, socket.username);
      socket.username = newusername;
      userlist.push(newusername);
      socket.emit("chat username", newusername);
      socket.emit("update userlist", userlist);
      console.log(userlist);
      socket.emit("user connected");
      socket.emit("newnick success");
    }
  });

  // On user request, send the chat history to the client
  socket.on("download history", function(data) {
    socket.emit("receive history", chathistory);
  });

  // On user request, send the current active user list to the client
  socket.on("update userlist", function(data) {
    io.emit("update userlist", userlist);
  });
});
