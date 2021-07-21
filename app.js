require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true });    // connect to MongoDB

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

// add secret to schema - must be BEFORE the model definition
//const secret = "Thisisourlittlesecret.";
const secret = process.env.SECRET;
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });  // can add other entries into array to encrypt

const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

// post req from the register form
app.post("/register", function(req, res) {

  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });

  // save the user and render the secrets page if no error
  newUser.save(function(err) {      // will encrypt password
    if (err) {
      console.log(err)
    } else {
      res.render("secrets");
    }
  });

});

// check if user is in database
app.post("/login", function(req, res) {
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email: username}, function(err, foundUser) {    // will decrypt password
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        if (foundUser.password === password) {    // if user exists, check if their password is same as in database
          res.render("secrets")
        }
      }
    }
  })

});











app.listen(3000, function() {
  console.log("Server started on port 3000.")
});
