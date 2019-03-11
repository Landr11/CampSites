var mongoose = require("mongoose");
var Campground = require("./models/campground");
var Comment = require("./models/comment");

var data = [
    {name:"Douala Mountains",
     image:"https://farm9.staticflickr.com/8424/7873626056_31eefb3de5.jpg",
     description:"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce pretium pulvinar ex, vitae tempus libero euismod ac. Fusce in laoreet risus. Integer semper luctus augue, sagittis facilisis quam consequat nec. Pellentesque massa ex, tempus vel turpis eget, tincidunt tempor orci. Mauris eu sem non magna consequat convallis et ac dolor. Curabitur suscipit neque ullamcorper, aliquam nisl porttitor, interdum enim. Maecenas tincidunt mauris purus. Etiam dignissim porta venenatis. Vestibulum aliquam nisi sed auctor ultrices. Mauris rhoncus lectus metus, vitae tempus sapien finibus non. Praesent ac tortor dolor. "
    }, 
    
    {
        name: "Tokyo Forest",
        image:"https://farm8.staticflickr.com/7457/9586944536_9c61259490.jpg",
        description:"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce pretium pulvinar ex, vitae tempus libero euismod ac. Fusce in laoreet risus. Integer semper luctus augue, sagittis facilisis quam consequat nec. Pellentesque massa ex, tempus vel turpis eget, tincidunt tempor orci. Mauris eu sem non magna consequat convallis et ac dolor. Curabitur suscipit neque ullamcorper, aliquam nisl porttitor, interdum enim. Maecenas tincidunt mauris purus. Etiam dignissim porta venenatis. Vestibulum aliquam nisi sed auctor ultrices. Mauris rhoncus lectus metus, vitae tempus sapien finibus non. Praesent ac tortor dolor. "
    },
    
    {
        name:"Doncaster Woods",
        image:"https://farm4.staticflickr.com/3741/9586943706_b22f00e403.jpg",
        description:"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce pretium pulvinar ex, vitae tempus libero euismod ac. Fusce in laoreet risus. Integer semper luctus augue, sagittis facilisis quam consequat nec. Pellentesque massa ex, tempus vel turpis eget, tincidunt tempor orci. Mauris eu sem non magna consequat convallis et ac dolor. Curabitur suscipit neque ullamcorper, aliquam nisl porttitor, interdum enim. Maecenas tincidunt mauris purus. Etiam dignissim porta venenatis. Vestibulum aliquam nisi sed auctor ultrices. Mauris rhoncus lectus metus, vitae tempus sapien finibus non. Praesent ac tortor dolor. "
    },
     {
     name:"Oxford Orora",
     image:"https://farm1.staticflickr.com/56/170314171_0aab24bafe.jpg",
     description:"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce pretium pulvinar ex, vitae tempus libero euismod ac. Fusce in laoreet risus. Integer semper luctus augue, sagittis facilisis quam consequat nec. Pellentesque massa ex, tempus vel turpis eget, tincidunt tempor orci. Mauris eu sem non magna consequat convallis et ac dolor. Curabitur suscipit neque ullamcorper, aliquam nisl porttitor, interdum enim. Maecenas tincidunt mauris purus. Etiam dignissim porta venenatis. Vestibulum aliquam nisi sed auctor ultrices. Mauris rhoncus lectus metus, vitae tempus sapien finibus non. Praesent ac tortor dolor. "
     }
    ];
    
    function seedDB(){
    // REMOVE ALL Campground at launch
         Campground.remove({}, function(err){
            if(err){
              console.log(err);
            } else {
              console.log("Removed Campgrounds!");
              // Add a few Campgrounds
                 data.forEach(function(seed){
                  Campground.create(seed, function(err, campground){
                  if(err) {
                    console.log(err);
                    } else {
                      console.log("Added a Campground!");
                      // Create a Comment on each Campground
                      Comment.create({
                          text:"WOW it looks so beautiful OMG!!", 
                          author: "Dave Palumbo"
                      }, function(err, comment){
                          if(err){
                              console.log(err);
                          } else {
                              campground.comments.push(comment);
                              campground.save();
                              console.log("Comment added");
                          }
                          
                          
                      });
                  }
                });
              });
    
            }
        });

// Add some comments

}


module.exports = seedDB;

