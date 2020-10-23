//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

const secret = "mystonglittleunguessablesecret";
userSchema.plugin(encrypt, {secret: secret, encryptedFields: ["password"]});

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
          if(req.body.password===result.password){
            res.render("secrets");
          } else {
            console.log("password incorrect");
            res.redirect("/");
          }
        }
      }
    });
  });

app.route("/register")
  .get(function(req, res){
    res.render("register");
  })
  .post(function(req, res){
    const newUser = new User({
      username:req.body.username,
      password: req.body.password
    });
    newUser.save(function(err, result){
      if(!err){
        console.log(result);
        res.render("secrets");
      }
    });
  });

app.listen(3000, function(){
  console.log("Server is listening on port 3000...");
});
