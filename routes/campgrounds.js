var express = require("express");
var router = express.Router();
var Campground   = require("../models/campground");
var Comment      = require("../models/comment");
var User         = require("../models/user");
var middleware   = require("../middleware");

var NodeGeocoder = require('node-geocoder');


var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dp4ph44te', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});
 
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);


// CampGround Request  INDEX of all Campgrounds
router.get("/", function(req, res){
    var noMatch = null;
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}, function(err, campgrounds){
        if(err){
            console.log("There was an Error");
            console.log(err);
        } else {
            
            if(campgrounds.length < 1){
                noMatch = "No campgrounds match that search, please try again.";
            }
            res.render("campgrounds/index", {campgrounds: campgrounds, currentUser: req.user, page: 'campgrounds', noMatch: noMatch});
        }
    });
        
    } else {
    //Get all camgrounds from the DB using mongoose MongoDB
    Campground.find({}, function(err, campgrounds){
        if(err){
            console.log("There was an Error");
            console.log(err);
        } else {
            res.render("campgrounds/index", {campgrounds: campgrounds, currentUser: req.user, page: 'campgrounds', noMatch: noMatch});
        }
    });
    }

    // res.render("campgrounds", {campgrounds: campgrounds});
});

//Create Campgrounds Routes=====

//show form to create NEW campground
router.get("/new", middleware.isLoggedIn, function(req, res){
    res.render("campgrounds/new.ejs");
});


//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res){
  // get data from form and add to campgrounds array
  var name = req.body.name;
  var price = req.body.price;
  var desc = req.body.description;
  var author = {
      id: req.user._id,
      username: req.user.username
  };
  cloudinary.uploader.upload(req.file.path, function(result){
      //add cloudinary url for the image to the campground object under image property
      req.body.image = result.secure_url;
       geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    var lat = data[0].latitude;
    var lng = data[0].longitude;
    var location = data[0].formattedAddress;
    var newCampground = {name: name, image: result.secure_url, description: desc, author:author, location: location, lat: lat, lng: lng, price: price};
    // Create a new campground and save to DB
    Campground.create(newCampground, function(err, newlyCreated){
        if(err){
            req.flash('error', err.message);
            return res.redirect("back");
        } else {
            //redirect back to campgrounds page
            res.redirect("/campgrounds/" + newlyCreated.id);
        }
    });
  });
 
  });
});





// // Route to CREATE new Campground from POST request
// router.post("/", middleware.isLoggedIn, function(req, res){
//     // get data from form and add to campgrounds array
//     var name = req.body.name;
//     var price = req.body.price;
//     var image = req.body.image;
//     var description = req.body.description;
//     var author = {
//         id: req.user._id, 
//         username: req.user.username
//     };
//     var newCampground = {name: name, price: price, image: image, description: description, author: author};
//     // Create a new Campground and push it to the database
//     Campground.create(newCampground, function(err, newlycreatedcampground){
//         if(err){
//             console.log("There was an error");
//             console.log(err);
//         } else {
//             // redirect back to campgrounds page
//             res.redirect("/campgrounds");
//         }
//     });
    
// });


//SHOW  - shows more info about one Campground
router.get("/:id", function(req, res){
    // find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err){
            console.log(err);
        } else {
            //render SHOW(restfult route) template with provided ID
             res.render("campgrounds/show", {campground: foundCampground});
        }
    });
    
    
});


//Edit Campground Route
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
          Campground.findById(req.params.id, function(err, foundCampground){
         
                  res.render("campgrounds/edit", {campground: foundCampground});
            
       });
        //does user own the campground?
        //otherwise redirect
     //if not redirect
     
   
});


// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, function(req, res){
  geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    req.body.campground.lat = data[0].latitude;
    req.body.campground.lng = data[0].longitude;
    req.body.campground.location = data[0].formattedAddress;

    Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, campground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            req.flash("success","Successfully Updated!");
            res.redirect("/campgrounds/" + campground._id);
        }
    });
  });
});


// //Update Campground Route
// router.put("/:id", middleware.checkCampgroundOwnership, function(req, res){
//     //Find and Update the correct Campground
//     Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
//         if(err){
//             res.redirect("campgrounds");
//         } else {
//             res.redirect("/campgrounds/" + req.params.id);
//         }
//     });
    
// });


//DESTROY Campground Route
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/campgrounds");
        } else {
             res.redirect("/campgrounds");
        }
    });
});





function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;


// //CREATE - add new campground to DB
// router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res){
//   // get data from form and add to campgrounds array
//   var name = req.body.name;
//   var price = req.body.price;
//   var desc = req.body.description;
//   var author = {
//       id: req.user._id,
//       username: req.user.username
//   };
//   cloudinary.uploader.upload(req.file.path, function(result){
//       //add cloudinary url for the image to the campground object under image property
//       req.body.campground.image = result.secure_url;
//   });
//   geocoder.geocode(req.body.location, function (err, data) {
//     if (err || !data.length) {
//       req.flash('error', 'Invalid address');
//       return res.redirect('back');
//     }
//     var lat = data[0].latitude;
//     var lng = data[0].longitude;
//     var location = data[0].formattedAddress;
//     var newCampground = {name: name, image: result.secure_url, description: desc, author:author, location: location, lat: lat, lng: lng, price: price};
//     // Create a new campground and save to DB
//     Campground.create(newCampground, function(err, newlyCreated){
//         if(err){
//             console.log(err);
//         } else {
//             //redirect back to campgrounds page
//             res.redirect("/campgrounds");
//         }
//     });
//   });
// });

