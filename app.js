require('dotenv').config();

var express             = require("express");                 //the framework
var app                 = express();                          // renaming express as app
var bodyParser          = require("body-parser");             //use to transfer data from the frontend to the backend
var mongoose            = require("mongoose");                //mongoose handles the database
var flash               = require("connect-flash");           //handles the alert/flash messages on the app
var passport            = require("passport");                //authentification
var LocalStrategy       = require("passport-local");          //auth
var methodOverride      = require("method-override");         //use to add functionality to html like the PUT and DELETE method in html forms
var Campground          = require("./models/campground");     //require MongoDB database Schemas
var Comment             = require("./models/comment");        //require MongoDB database Schemas
var User                = require("./models/user");           //require MongoDB database Schemas
var seedDB              = require("./seeds");                 //seeding the app with fake data for testing



//Requiring App Routes
var commentRoutes       = require("./routes/comments"),
    campgroundsRoutes   = require("./routes/campgrounds"),
    authRoutes          = require("./routes/index");


//mongoose.connect('mongodb://localhost:27017/yelp_camp_v14', { useNewUrlParser: true }); 
mongoose.connect('mongodb://localhost:27017/yelp_camp_v15', {useNewUrlParser: true, useCreateIndex: true});


//Seeding the site with data for testing
// seedDB();

//Use CSS file inside the Public Directory
app.use(express.static(__dirname + "/public"));

//Body-parser is used to collect data from the body and convert it to JS
app.use(bodyParser.urlencoded({extended: true}));

//use to ommit .ejs at the end of ejs files name
app.set("view engine", "ejs");

//Method override to include PUT and Update method in HTML FORM
app.use(methodOverride("_method"));

//Using package alert/flash messages
app.use(flash());

//Moment to tell the time since something has been added 
app.locals.moment = require('moment');

//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "I hope there is season 4 news at EVO Japan!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Pass req.user = currentUser to every route using middleware(shortcut)
app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
   next();
});


app.use("/", authRoutes);
app.use("/campgrounds", campgroundsRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);


app.listen(process.env.PORT, process.env.IP, function(){
    console.log("The YelpCamp Server has started");
});