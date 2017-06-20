// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");
// Requiring our Comments and News Articles models
var Comment = require("./models/Comment.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;
// Initialize Express
var app = express();
var PORT = process.env.PORT || 3000; 
// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));
// Make public a static dir
app.use(express.static("public"));
// Database configuration with mongoose
mongoose.connect("mongodb://localhost/newsScraperApp");
var db = mongoose.connection;
// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});
// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});
var articles = {};
// Routes
// A GET request to scrape the news website
app.get("/", function(req, res) {
  request("https://www.reddit.com/r/news", function(error, response, html) {
    var $ = cheerio.load(html);
    $("p.title").each(function(i, element) {
      var result = {};
      result.title = $(this).text();
      result.link = $(element).children("a").attr("href");
      Article.findOne({title : result.title}, function(error, res) {
        if (error) {
          console.log(error);
        }
        else {
          if (res === null) {
            var entry = new Article(result);
            entry.save(function(err, doc) {
             if (err) {
               console.log(err);
             }
              else {
                console.log(doc);
              }
            });
          } else if (result.title !== res.title) {
          var entry = new Article(result);
          entry.save(function(err, doc) {
            if (err) {
              console.log(err);
            }
            else {
              console.log(doc);
            }
          });
        } else {
            console.log(res);
        }
      }
    });
  });
});
  res.sendFile(path.join(__dirname, "public", "scraper.html"));
});
// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  Article.find({}, function(error, doc) {
    if (error) {
      console.log(error);
    }
    else {
      res.json(doc);
    }
  });
});
// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Article.findOne({ "_id": req.params.id }).populate("comment").exec(function(error, doc) {
    if (error) {
      console.log(error);
    }
    else {
      res.json(doc);
    }
  });
});
// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  var newComment = new Comment(req.body);
  // And save the new note the db
  newComment.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's comment
      Article.findOneAndUpdate({ "_id": req.params.id }, { "comment": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
});
// To delete the comment, here we update the comment with empty string.
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  var newComment = new Comment({title:'', body:''});
  // And save the new note the db
  newComment.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's comment
      Article.findOneAndUpdate({ "_id": req.params.id }, { "comment": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
});
// Listen on port 3000
app.listen(PORT, function() {
  console.log("App running on port 3000!");
});