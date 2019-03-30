var Campground = require("../models/campground");
var Comment = require("../models/comment");
var Review = require("../models/review");

// all the middleware goes here
var  middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function(req, res, next){
          if(req.isAuthenticated()){
          Campground.findById(req.params.id, function(err, foundCampground){
             if(err){
                 req.flash("error", "Campground not found");
                res.redirect("back");
             } else {
                 // Does the user own the Campground?
                 if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin){
                      next();
                 } else{
                     req.flash("error","You do not have permission to do that" );
                     res.redirect("back");
                 }
                
             }
           });
         } else {
             req.flash("error", "You need to be Logged in to do that");
             res.redirect("back");
         
     }
        //does user own the campground?
        //otherwise redirect
     //if not redir
};

middlewareObj.checkCommentOwnership = function(req, res, next){
        if(req.isAuthenticated()){
          Comment.findById(req.params.comment_id, function(err, foundComment){
             if(err){
                 req.flash("error", "Comment not found");
                res.redirect("back");
             } else {
                 // Does the user own the Comment?
                 if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){
                      next();
                 } else{
                     req.flash("error", "You don't have permission to do that");
                     res.redirect("back");
                 }
                
             }
           });
         } else {
             req.flash("error", "You need to be logged in to do that");
             res.redirect("back");
             
         }
            //does user own the campground?
            //otherwise redirect
         //if not redir
};


middlewareObj.checkUserOwnership = function(req, res, next) {
// is user logged in?
      if(req.isAuthenticated()) {
        if(req.user._id.equals(req.params.id) || req.user.isAdmin) {
            next();
        } else {
            req.flash("error", "Access denied, this is not your profile.");
            res.redirect("/users/" + req.params.id);
        }
    } else {
        req.flash("error", "You are not logged in.");
        res.redirect("/login");
    }
};



middlewareObj.checkReviewOwnership = function(req, res, next) {
    if(req.isAuthenticated()){
        Review.findById(req.params.review_id, function(err, foundReview){
            if(err || !foundReview){
                res.redirect("back");
            }  else {
                // does user own the comment?
                if(foundReview.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

middlewareObj.checkReviewExistence = function (req, res, next) {
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id).populate("reviews").exec(function (err, foundCampground) {
            if (err || !foundCampground) {
                req.flash("error", "Campground not found.");
                res.redirect("back");
            } else {
                // check if req.user._id exists in foundCampground.reviews
                var foundUserReview = foundCampground.reviews.some(function (review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review.");
                    return res.redirect("/campgrounds/" + foundCampground._id);
                }
                // if the review was not found, go to the next middleware
                next();
            }
        });
    } else {
        req.flash("error", "You need to login first.");
        res.redirect("back");
    }
};

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
};


module.exports = middlewareObj;