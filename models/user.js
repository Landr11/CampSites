var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var bcrypt = require("bcrypt-nodejs");
var Campground = require('./campground');
var Comment = require('./comment');

var UserSchema = new mongoose.Schema ({
    username: {type: String, unique: true, required: true},
    password: String, 
    avatar: String,
    imageId: String,
    firstName: String, 
    lastName: String,
    description: String,
    email: {type: String, unique: true, required: true},
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isAdmin: {type: Boolean, default: false},
    notifications: [
    	{
    	   type: mongoose.Schema.Types.ObjectId,
    	   ref: 'Notification'
    	}
    ],
    followers: [
    	{
    		type: mongoose.Schema.Types.ObjectId,
    		ref: 'User'
    	}
]
});


// pre-hook middleware to delete all user's posts and comments from db when user is deleted
UserSchema.pre('remove', async function(next) {
  try {
      await Campground.remove({ 'author.id': this._id });
      await Comment.remove({ 'author.id': this._id });
      next();
  } catch (err) {
      console.log(err);
  }
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);