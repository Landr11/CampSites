var express = require("express");
var router = express.Router();
var Campground   = require("../models/campground");
var Comment      = require("../models/comment");
var Notification = require("../models/notification");
var Review = require("../models/review");
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
var upload = multer({ storage: storage, fileFilter: imageFilter});

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
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if(req.query.search) {
        //Fuzzy search
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, campgrounds) {
            Campground.count({name: regex}).exec(function (err, count) {
                if (err) {
                    console.log(err);
                    res.redirect("back");
                } else {
                    if(campgrounds.length < 1) {
                        noMatch = "No campgrounds match that query, please try again.";
                    }
                    //execute if no error was found and campgrounds exist, return the search
                    res.render("campgrounds/index", {
                        campgrounds: campgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: req.query.search
                    });
                }
            });
        });
    } else {
        // get all campgrounds from DB
        Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, campgrounds) {
            Campground.count().exec(function (err, count) {
                if (err) {
                    console.log(err);
                } else {
                    res.render("campgrounds/index", {
                        campgrounds: campgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: false
                    });
                }
            });
        });
    }
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
  cloudinary.v2.uploader.upload(req.file.path, async function(err, result){
      if(err){
          req.flash('error', err.message);
          return res.redirect("back");
      }
      //add cloudinary image url to the campground object under image property
      req.body.image = result.secure_url;
      //add image public_id to the imageId of the campground
      req.body.imageId = result.public_id;
      geocoder.geocode(req.body.location, async function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    var lat = data[0].latitude;
    var lng = data[0].longitude;
    var location = data[0].formattedAddress;
    var newCampground = {name: name, image: result.secure_url, imageId: result.public_id, description: desc, author:author, location: location, lat: lat, lng: lng, price: price};
    // Create a new campground and save to DB
   try {
          let campground = await Campground.create(newCampground);
          let user = await User.findById(req.user._id).populate('followers').exec();
          let newNotification = {
            username: req.user.username,
            campgroundId: campground.id
          };
          for(const follower of user.followers) {
            let notification = await Notification.create(newNotification);
            follower.notifications.push(notification);
            follower.save();
          }
    
          //redirect back to campgrounds page
          req.flash("success", "New campground created!");
          res.redirect("/campgrounds/" + campground._id);
        } catch(err) {
          req.flash('error', err.message);
          res.redirect('back');
        }
    });
  });
 
  });



//SHOW  - shows more info about one Campground
router.get("/:id", function(req, res){
    // find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").populate({
        path: "reviews",
        options: {sort: {createdAt: -1}}
    }).exec(function (err, foundCampground) {
        if (err) {
            console.log(err);
        } else {
            //render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});


//Edit Campground Route
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
          Campground.findById(req.params.id, function(err, foundCampground){
         
                  res.render("campgrounds/edit", {campground: foundCampground});
            
       });
   
});


// UPDATE CAMPGROUND ROUTE

router.put("/:id", middleware.checkCampgroundOwnership, upload.single("image"), function(req, res){
    //find campground by ID
    Campground.findById(req.params.id, async function(err, campground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
              if(req.file){
                  try{
                      await cloudinary.v2.uploader.destroy(campground.imageId);
                      var result = await cloudinary.v2.uploader.upload(req.file.path);
                      campground.imageId = result.public_id;
                      campground.image = result.secure_url;
         
                  } catch(err){
                        req.flash("error", err.message);
                      return res.redirect("back");
                  }
        
              }
              //Update geocode and campground 
            geocoder.geocode(req.body.location, function (err, data) {
                  if (err || !data.length) {
                       req.flash('error', 'Invalid address');
                       return res.redirect('back');
                     }
            campground.lat = data[0].latitude;
            campground.lng = data[0].longitude;
            campground.location = data[0].formattedAddress;
            campground.price = req.body.campground.price;
            campground.description = req.body.campground.description;
            campground.name = req.body.campground.name;
            campground.save();
            req.flash("success","Successfully Updated!");
            res.redirect("/campgrounds/" + campground._id);
   });     
            
        }
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

router.delete("/:id", middleware.checkCampgroundOwnership, function(req,res){
    Campground.findByIdAndRemove(req.params.id, async function(err, campground){
        if(err){
            req.flash("error", err.message);
            return res.redirect("back");
        } else {
            try {
              //Delete cloudinary picture
               await cloudinary.v2.uploader.destroy(campground.imageId);
               // Delete all comments associated with the campground
                Comment.remove({"_id": {$in: campground.comments}}, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    }
                });
                //Delete all reviews associated with the campground
                Review.remove({"_id": {$in: campground.reviews}}, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    }
                });
                //Delete campgrounds from the database
               campground.remove();
               req.flash("success", "Campground deleted.");
               res.redirect("/campgrounds");
            } catch (err){
                req.flash("error", err.message);
                return res.redirect("back");
            }
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

