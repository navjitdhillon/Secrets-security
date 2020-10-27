const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

// Require 3 packages for local authentication using passport
const session = require("express-session");
const passport = require("passport");
  // was installed through npm but no need to require passport-local (for local strategy)
const passportLocalMongoose = require("passport-local-mongoose");


const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

// initialize express-session module to use the sessions with express
app.use(session({
  secret: "my trusty little secret",
  resave: false,
  saveUninitialized: false
}));

// initialize passport and configure it to manage express sessions
app.use(passport.initialize());
app.use(passport.session());

// set up or connect to the DB, create the schema as usual
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

// setup userSchema to use passportLocalMongoose as a plugin, to use passport to hash, salt and save credentials to mongoDB
userSchema.plugin(passportLocalMongoose);

// create the model from schema as usual
const User = mongoose.model("User", userSchema);

// use createStrategy method to setup passport-local LocalStrategy with the correct options.
passport.use(User.createStrategy());

// setup passport to serialize and deserialize the user model for session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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
