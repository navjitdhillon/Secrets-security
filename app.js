//jshint esversion:6
// only when using common encryption, or other environment variables
// require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//when using common encryption instead of md5 or bcrypt hash
// const encrypt = require("mongoose-encryption");

// when using md5 instead of a beter bcrypt alternative
// const md5 = require("md5");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

// updated to using md5 hash instead of encryption
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = mongoose.model("User", userSchema);

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", function(req, res){
  res.render("home");
});

app.route("/login")
  .get(function(req, res){
    res.render("login");
  })
  .post(function(req, res){
    User.findOne({username: req.body.username}, function(err, result){
      if(!err){
        if(!result){
          console.log("user not found");
          res.redirect("/");
        } else {
          bcrypt.compare(req.body.password, result.password, function(err, result) {
            if(!err){
              if(result==true){
                res.render("secrets");
                console.log("Its a match!");
              } else {
                console.log("Password incorrect");
                res.redirect("/");
              }
            }
          });
        }
      }
    });
  });

app.route("/register")
  .get(function(req, res){
    res.render("register");
  })
  .post(function(req, res){
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
      const newUser = new User({
        username:req.body.username,
        password:hash
      });
      newUser.save(function(err, result){
        if(!err){
          console.log(result);
          res.render("secrets");
        }
      });
    });
  });

app.listen(3000, function(){
  console.log("Server is listening on port 3000...");
});
