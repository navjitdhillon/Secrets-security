const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
require("dotenv").config();

// Require 3 packages for local authentication using passport =>
const session = require("express-session");
const passport = require("passport");
  // although installed through npm but no need to require passport-local (for local strategy)
const passportLocalMongoose = require("passport-local-mongoose");

// for google oauth 2.0 passport LocalStrategy
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// plugin for Mongoose which adds a findOrCreate method to models (as needed in passport google oauth documentation).
const findOrCreate = require("mongoose-findorcreate");
const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

// initialize express-session module to use the sessions with express =>
app.use(session({
  secret: "my trusty little secret",
  resave: false,
  saveUninitialized: false
}));

// initialize passport and configure it to manage express sessions =>
app.use(passport.initialize());
app.use(passport.session());

// set up or connect to the DB, create the schema as usual =>
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String
});

// add passportLocalMongoose plugin for userSchema to use passport to hash, salt and save credentials to mongoDB
userSchema.plugin(passportLocalMongoose);

// add findOrCreate plugin to userSchema to provide findOrCreate functionality needed in passport's google auth strategy
userSchema.plugin(findOrCreate);

// create the model from schema as usual
const User = mongoose.model("User", userSchema);

// use createStrategy method to setup passport-local LocalStrategy with the correct options.
passport.use(User.createStrategy());

// setup passport to serialize and deserialize the user model for session support
// shortcuts used for local strategy will no longer work for google etc.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// google oauth 2.0 passport strategy setup =>
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
    // this callbackURL field above needs to match the redirect uri field in google developer console
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// app routes =>
app.get("/", function(req, res){
  res.render("home");
});

app.get("/secrets", function(req, res){
  if(req.isAuthenticated()){
    res.render("secrets");
  }else{
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

// get routes for google auth and redirect options on register and login pages =>
app.get("/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] }));

app.get("/auth/google/callback",
   passport.authenticate('google', { failureRedirect: '/login' }),
   function(req, res){
     res.redirect("/secrets");
   });

app.route("/login")
  .get(function(req, res){
    res.render("login");
  })
  .post(function(req, res){
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
    req.login(user, function(err, result){
      if(!err){
        passport.authenticate("local")( req, res, function(){
        res.redirect("/secrets");
        });
      }
    });
  });

app.route("/register")
  .get(function(req, res){
    res.render("register");
  })
  .post(function(req, res){
    User.register({username:req.body.username}, req.body.password, function(err, user) {
    // User.save functionality inbuilt in .register function of passportLocalMongoose package.
      if(!err){
        // for continous session logged-in
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
        console.log(user);
      }
    });
  });

app.listen(3000, function(){
  console.log("Server is listening on port 3000...");
});
