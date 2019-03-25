var express      = require("express");
var router       = express.Router();
var passport     = require("passport");
var User         = require("../models/user");
var Campground   = require("../models/campground");
var Comment      = require("../models/comment");
var Notification = require("../models/notification");
var async        = require("async");
var nodemailer   = require("nodemailer");
var crypto       = require("crypto");
var middleware = require("../middleware");



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


var secretcode = process.env.SECRET_CODE;

//Landing Page Request Root route 
router.get("/", function(req, res){
    res.render("landing.ejs");
});


//============================
//AUTHENTIFICATION ROUTES
//============================

//Get Route Show the Registration form 
router.get("/register", function(req, res){
    res.render("register", {page: 'register'});
});



//Post Route For Sign up logic
router.post("/register", upload.single("avatar"), function(req, res){
  //Upload image to cloudinary and create new user
  cloudinary.v2.uploader.upload(req.file.path, function(err, result){
    
    if(err){
            req.flash("error", err.message);
            return res.redirect("/register");
        }
    // add image url to user avatar
      req.body.avatar = result.secure_url;
   // add image id to user imageID
      req.body.imageId = result.public_id;
      
    var newUser = new User({
        username: req.body.username, firstName: req.body.firstName, lastName: req.body.lastName, email: req.body.email, avatar: result.secure_url, imageId: result.public_id
        
    });
    if(req.body.admincode === secretcode){
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            req.flash("error", err.message);
            return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, function(){
            req.flash("success","Welcome to Yelpcamp " + user.username);
           res.redirect("/campgrounds");
        });
        
    });
    
    
  });
    
}); 



//Get Route show the Login form 
router.get("/login", function(req, res){
   res.render("login", {page: 'login'});
});

//Post Route for Login Logic
//Middleware logic inside the logic route to auth=========
//======app.post("/login", middleware, callbackfunction);======

router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds",
        failureRedirect: "/login",
        failureFlash: true,
        successFlash: "Welcome back to CampSite!" 
    }), function(req, res) {
});

//Logout Route 
router.get("/logout", function(req, res){
    req.logout();
    req.flash("success", "Logged you out");
    res.redirect("/");
});

//PASSWORD RESET ROUTES

//Get route to access the reset page
router.get("/forgot", function(req, res){
    res.render("forgot");
});



//Post route to request reset the new password
router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
          if(err){
                    req.flash("error", "Something went wrong" );
                }
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Yandex', 
        auth: {
          user: 'Onosansan@yandex.com',
          pass: process.env.YANDEXPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'Onosansan@yandex.com',
        subject: 'CampSites Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

//Get Route to access the reset password page, from email Token
router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if(err){
                    req.flash("error", "Something went wrong" );
                }
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

//Post route to Set New Password 
router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
            if(err){
                    req.flash("error", "Something went wrong" );
                }
          user.setPassword(req.body.password, function(err) {
              if(err){
                    req.flash("error", "Something went wrong" );
                }
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
                if(err){
                    req.flash("error", "Something went wrong" );
                }
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          });
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Yandex', 
        auth: {
          user: 'Onosansan@yandex.com',
          pass: process.env.YANDEXPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'Onosansan@yandex.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
      if(err){
          req.flash("error", "Something went wrong" );
      }
    res.redirect('/campgrounds');
  });
});




//USER PROFILES ROUTES

// USER PROFILE ROUTE
router.get('/users/:id', async function(req, res) {
  try {
    let user = await User.findById(req.params.id).populate('followers').exec();
    Campground.find().where("author.id").equals(user._id).exec(function(err, campgrounds){
        if(err) {
          req.flash("error", "Something went wrong.");
          return res.redirect("/");
        } 
        res.render("users/show", {user, campgrounds: campgrounds});
      });
  } catch(err) {
    req.flash('error', err.message);
    return res.redirect('back');
  }
});

// follow user
router.get('/follow/:id', middleware.isLoggedIn, async function(req, res) {
  try {
    let user = await User.findById(req.params.id);
    user.followers.addToSet(req.user._id);
    user.save();
    req.flash('success', 'Successfully followed ' + user.username + '!');
    res.redirect('/users/' + req.params.id);
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

// view all notifications route
router.get('/notifications', middleware.isLoggedIn, async function(req, res) {
  try {
    let user = await User.findById(req.user._id).populate({
      path: 'notifications',
      options: { sort: { "_id": -1 } }
    }).exec();
    let allNotifications = user.notifications;
    res.render('notifications/index', { allNotifications });
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

// handle notification route
router.get('/notifications/:id', middleware.isLoggedIn, async function(req, res) {
  try {
    let notification = await Notification.findById(req.params.id);
    notification.isRead = true;
    notification.save();
    console.log(notification.campgroundId);
    res.redirect("/campgrounds/" + notification.campgroundId);
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

//Edit User Profile show form Route
router.get("/users/:id/edit", middleware.checkUserOwnership, function(req, res){
  User.findById(req.params.id, function(err, foundUser){
     if(err){
            req.flash("error", "Something went wrong" );
            res.redirect("/");
     }
            res.render("users/edit", {user: foundUser});
       });
});


//Edit Profile PUT/UPDATE Route
router.put("/users/:id", upload.single("avatar"), middleware.checkUserOwnership, function(req, res){
    User.findById(req.params.id, async function(err, user){
        if (err){
          req.flash("error", err.message);
          return res.redirect("back");
        }
        try {
            if (req.file) {
                var result = await cloudinary.v2.uploader.upload(req.file.path);
                user.avatar = result.secure_url;
              }
            user.username = req.body.user.username; 
            user.firstName = req.body.user.firstName; 
            user.lastName = req.body.user.lastName; 
            user.description = req.body.user.description; 
            user.email = req.body.user.email;
            user.save();
            //Updates Campground Owners Name To Match The New One
            Campground.update({"author.id": user._id}, {$set: {"author.username": user.username}}, function(err, campground){
                if(err){
                    console.log(campground.author._id);
                }
            });
            //Updates Comment Owners Name To Match New One    
            Comment.update({"author.id": user._id}, {$set: {"author.username": user.username}}, function(err, Comment){
                if(err){
                    console.log(Comment.author._id);
                }
            });
            req.flash("success","Successfully Updated!");
            res.redirect("/users/" + user._id);
          } catch (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
    });
});


//Delete Pofile Route
router.delete("/users/:id", function(req, res){
   User.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/campgrounds");
        } else {
             res.redirect("/campgrounds");
        }
    });
});


// //Middleware
// function isLoggedIn(req, res, next){
//     if(req.isAuthenticated()){
//         return next();
//     }
//     req.flash("error", "You need to be logged in to do that");
//     res.redirect("/login");
// }




function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;