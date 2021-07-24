require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

// INITIALIZE SESSION MUST BE HERE
// use session package with setup
app.use(session({
  secret: "Our little secret.", // could be anything, move to env file later
  resave: false,
  saveUninitialized: false
}));

// use passport and initialize, use passport to initialize sessions
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true });    // connect to MongoDB
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

// add passportLocalMongoose to mongoose schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }) // profile gives you email and userID
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
  // look through all users in users collection, look thru secret field pick out users where field, ne = not equal, to null
  User.find({"secret": {$ne: null}}, function(err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers})
      }
    }
  })
});

app.get("/submit", function(req, res) {
  if (req.isAuthenticated()){  // if they're logged in / have cookie
    res.render("submit");
  } else {
    res.redirect("/login"); // if they aren't logged in, force them to log in before they can view page
  }
});

app.post("/submit", function(req, res) {
  const submittedSecret = req.body.secret;    // tapping into name of input field in submit.ejs

  User.findById(req.user.id, function(err, foundUser) {   // req.user.id is the Id of user in current session
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {                        // if a user is found
        foundUser.secret = submittedSecret;   // set their record's secret field to the one they typed in the input box
        foundUser.save(function() {           // save the new user info to DB
          res.redirect("/secrets")            // after saved, redirect to secrets page
        });
      }
    }
  });
});

// deauthenticate user and end session
app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/"); // redirect to home page
});

// post req from the register form
app.post("/register", function(req, res) {

  User.register({username: req.body.username}, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.render("/register");  // redirect and have them try again
    } else {
      passport.authenticate("local") (req, res, function() {  // only if successful
        res.redirect("/secrets"); // use route so they can view directly if logged in
      });
    }
  });

});

// check if user is in database
app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local") (req, res, function() {    // send a cookie to browser, hold on to it
        res.redirect("/secrets");
      });
    }
  });

});











app.listen(3000, function() {
  console.log("Server started on port 3000.")
});
