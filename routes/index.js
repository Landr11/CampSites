var express      = require("express");
var router       = express.Router();
var passport     = require("passport");
var User         = require("../models/user");
var Campground   = require("../models/campground");
var async        = require("async");
var nodemailer   = require("nodemailer");
var crypto       = require("crypto");


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
router.post("/register", function(req, res){
    //=====alternative code=====//
    // User.register(new User({username: req.body.username})
    //User.register(newUser, req.body.password);
    var newUser = new User({
        username: req.body.username, firstName: req.body.firstName, lastName: req.body.lastName, email: req.body.email, avatar: req.body.avatar
        
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
    failureRedirect: "/login"
}), function(req, res){
   
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

//Show User Profile Route
router.get("/users/:id", function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            req.flash("error", "Something went wrong" );
            res.redirect("/");
        }
        Campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds){
            if(err){
            req.flash("error", "Something went wrong" );
            res.redirect("/"); 
                
            }
             res.render("users/show", {user: foundUser, campgrounds: campgrounds, currentUser: req.user});
        });
    });
});


//Edit User Profile show form Route
router.get("/users/:id/edit", function(req, res){
  User.findById(req.params.id, function(err, foundUser){
     if(err){
            req.flash("error", "Something went wrong" );
            res.redirect("/");
     }
            res.render("users/edit", {user: foundUser});
       });
});

//Edit Profile PUT/UPDATE Route
router.put("/users/:id", function(req, res){
  User.findByIdAndUpdate(req.params.id, req.body.user, function(err, updatedUser){
     if(err){
            res.redirect("back");
        } else {
            res.redirect("/users/" + req.params.id);
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



module.exports = router;