var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var bcrypt = require("bcrypt-nodejs");

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
    isAdmin: {type: Boolean, default: false}
});


UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);