/*
    Simple Njs chatroom + socketio
    Brandon Lu
        
    Desc
      Client side javascript to render and make chatroom interactive
      Can use improvements to make more efficient
*/


let messages = $("#messages");
let personaluser = $("#personaluser");
let activeusers = $("#users");

let username = rng(100000, 1000000);
let connectedusers = [];
let chathistory = [];

let typing = false;

// Colors from jquery.color.js
// https://stackoverflow.com/questions/10014271/generate-random-color-distinguishable-to-humans
Colors = {};
Colors.names = {
  aqua: "#00ffff",
  black: "#000000",
  blue: "#0000ff",
  brown: "#a52a2a",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgrey: "#a9a9a9",
  darkgreen: "#006400",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkviolet: "#9400d3",
  fuchsia: "#ff00ff",
  gold: "#ffd700",
  green: "#008000",
  indigo: "#4b0082",
  khaki: "#f0e68c",
  lime: "#00ff00",
  magenta: "#ff00ff",
  maroon: "#800000",
  navy: "#000080",
  olive: "#808000",
  orange: "#ffa500",
  pink: "#ffc0cb",
  purple: "#800080",
  violet: "#800080",
  red: "#ff0000"
};

/*
================================================
Autoscroll down as the chat progresses
===================================================
*/ function update() {
  $("#chat").scrollTop($(messages)[0].scrollHeight);
}

function rng(min, max) {
  let random = Math.floor(Math.random() * (max - min + 1) + min);
  return random;
}

//https://stackoverflow.com/questions/2532218/pick-random-property-from-a-javascript-object
var randomProperty = function(obj) {
  var keys = Object.keys(obj);
  return obj[keys[(keys.length * Math.random()) << 0]];
};

let nickcolor = randomProperty(Colors.names);

// w3schools method to grab cookies by name
// https://www.w3schools.com/js/js_cookies.asp
function getCookie(name) {
  var dc = document.cookie;
  var prefix = name + "=";
  var begin = dc.indexOf("; " + prefix);
  if (begin == -1) {
    begin = dc.indexOf(prefix);
    if (begin != 0) return null;
  } else {
    begin += 2;
    var end = document.cookie.indexOf(";", begin);
    if (end == -1) {
      end = dc.length;
    }
  }
  // because unescape has been deprecated, replaced with decodeURI
  //return unescape(dc.substring(begin + prefix.length, end));
  return decodeURI(dc.substring(begin + prefix.length, end));
}

function createCookie() {
  let obj = JSON.parse(
    '{"username":"' + username + '","nickcolor":"' + nickcolor + '"}'
  );
  document.cookie = "chatCookie=" + JSON.stringify(obj);
}

function readCookie() {
  let cookie = getCookie("chatCookie");
  //console.log('cookie exists', cookie);
  parsed = JSON.parse(cookie);
  //console.log('username ' + parsed.username);
  //console.log('nickcolor ' + parsed.nickcolor);
  username = parsed.username;
  nickcolor = parsed.nickcolor;
}

// we can delete the cookie by making it be past its expiry
function deleteCookie(name) {
  document.cookie = name + "= ; expires = Thu, 01 Jan 1970 00:00:00 GMT";
}

/*
================================================
Initial starting things and listeners for chat input
Will emit the chat state at startup, and listen for chat input to emit to server instance
===================================================
*/
$(document).ready(function() {
  let socket = io();

  // Initial commands done on initial client-server connect
  socket.on("connect", function() {
    console.log("Connected to Server");

    if (!getCookie("chatCookie")) {
      createCookie();
    } else {
      readCookie();
    }

    $(personaluser).text("Logged in As: " + username);

    // Add the user to the 'database' on the server end
    socket.emit("add user", {
      username: username,
      color: randomProperty(Colors.names)
    });
    // Client requests the chat history to render messages
    socket.emit("download history");

    // res.cookie('cookieName', {username: "testuser", nickcolor: "Color"} , { maxAge: 900000, httpOnly: true });
  });

  // Logs when a user has disconnected from the server
  socket.on("disconnect", function() {
    console.log("Disconnected from Server. Attempting to reconnect...");
  });

  // Will re-fetch the chat log on reconnecting to the server
  socket.on("reconnect", function() {
    console.log("Reconnected");
    $(messages).append($("<li>").text("Attempting to fetch new messages"));
    socket.emit("reconnect event", username);
  });

  // Event listener for form submit - parses message and such
  $("form").submit(function(e) {
    e.preventDefault(); // prevents page reloading

    let msg = $("#m").val();

    // Checks for a enw nickname
    if (msg.includes("/nick ")) {
      if (msg.length <= 6) {
        $(messages).append($("<li>").text("ERROR: Enter a nickname"));
      } else {
        let name = msg.substring(6, msg.length);
        socket.emit("new nickname", name);
      }

      //$(username) = msg.substring(6, msg.length);

      // Checks for a new nickname color
    } else if (msg.includes("/nickcolor ")) {
      if (msg.length <= 11) {
        $(messages).append($("<li>").text("ERROR: Enter a Hex Value"));
      } else {
        let temp = nickcolor;
        nickcolor = "#" + msg.substring(11, msg.length);
        // Regex from stackoverflow
        // https://stackoverflow.com/questions/8027423/how-to-check-if-a-string-is-a-valid-hex-color-representation/8027444
        if (!/^#[0-9A-F]{6}$/i.test(nickcolor)) {
          $(messages).append($("<li>").text("ERROR: Enter a Valid Hex Value"));
        } else {
          createCookie();
        }
        //socket.emit('new nickcolor', namecolor);
      }
    } else if (msg.includes("/deletecookie")) {
      if (msg.length === 13) {
        $(messages).append($("<li>").text("Session cookie has been deleted"));
        deleteCookie("chatCookie");
      }
      // Check if the user attempted to run a command that isnt the first two
    } else if (msg.substring(0, 1) === "/") {
      $(messages).append($("<li>").text("This command does not exist"));

      // Otherwise the form is a message, format the msg object and send to server
    } else if (msg != "") {
      // Ensure that the user can type - cant type if overlapping username
      if (typing === true) {
        socket.emit("chat message", {
          message: msg,
          sender: username,
          nickcolor: nickcolor
        });
      } else {
        $(messages).append(
          $("<li>").text(
            "SYSTEM: You are using an existing nickname. Please change before sending messages"
          )
        );
      }
    }

    // Clear the form and await a new message
    $("#m").val("");
    // Scroll
    update();

    return false;
  });

  /*
  ================================================
  Receives built message from server, constructs the html and adds it to the chat
  Also responsible for updating the various components of the chat
  Using chat message receives as a form of sync between server and chat system state
  ===================================================
  */
  socket.on("chat message", function(data) {
    /*font-weight: bold;*/

    let formattedname =
      "<span style='color:" + data.nickcolor + ";'>" + data.sender + "</span>";
    let fullmessage;
    if (data.sender == username) {
      fullmessage =
        "<b>" +
        data.timestamp +
        " " +
        formattedname +
        ": " +
        data.message +
        "</b>";
    } else {
      fullmessage = data.timestamp + " " + formattedname + ": " + data.message;
    }

    $(messages).append($("<li>").append(fullmessage));
    update();
    socket.emit("update userlist");
    //$('#chat').scrollTop($("#messages")[0].scrollHeight);
  });

  // Socket listener for receiving the chat history
  // Chat passed as array object, parses all the necessary messages and renders them on the screen
  socket.on("receive history", chat => {
    chathistory = chat;
    $(messages).empty();
    for (let i = 0; i < chathistory.length; i++) {
      let formattedname =
        "<span style='color:" +
        chathistory[i].nickcolor +
        ";'>" +
        chathistory[i].sender +
        "</span>";
      $(messages).append(
        $("<li>").append(
          chathistory[i].timestamp +
            " " +
            formattedname +
            ": " +
            chathistory[i].message
        )
      );
    }
    $(messages).append(
      $("<li>").append("SYSTEM: Latest messages have been grabbed")
    );
    update();
  });

  /*
================================================
Ensuring only one instance of nickname in chat
===================================================
*/
  socket.on("user exists", function(data) {
    $(messages).append(
      $("<li>").text(
        "SYSTEM: This nickname already exists! Please change using /nick <name>"
      )
    );
    update();
    typing = false;
  });

  // If the user is connected to the server correctly, then allow the client to send messages
  socket.on("user connected", function(data) {
    typing = true;
  });

  // Feedback for the user that their nickname change is successful
  socket.on("newnick success", function(data) {
    $(messages).append(
      $("<li>").text(
        "SYSTEM: Nickname has been successfully changed to " + username
      )
    );
    socket.emit("update userlist");
    createCookie();
    update();
  });
});

/*
================================================
Sets the username displayed at the top
===================================================
*/
socket.on("chat username", newusername => {
  $(personaluser).text("Logged in As: " + newusername);
  username = newusername;
});

/*
================================================
Updates the client's list of users curently in the chat
===================================================
*/
socket.on("update userlist", userlist => {
  connectedusers = userlist;
  //console.log(userlist);
  $(activeusers).empty();
  for (let i = 0; i < connectedusers.length; i++) {
    let formattedname = userlist[i];
    $(activeusers).append($("<li>").append(formattedname));
  }
});
