import express from 'express'; // Removed unnecessary import of `json`
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import cors from 'cors';
import jwt from 'jsonwebtoken'; // Changed to correct import of `jsonwebtoken`
import admin from "firebase-admin";
import serviceAccountKey from "./blogging-website-mern-firebase-adminsdk-d0ult-1362504656.json" assert { type: "json" };
import { getAuth } from "firebase-admin/auth";
import aws from "aws-sdk";

// Schema
import User from './Schema/User.js';
import Blog from './Schema/Blog.js';
import Notification from './Schema/Notification.js'
import Comment from "./Schema/Comment.js";
import { populate } from 'dotenv';
const server = express();
let PORT = 3000;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey)
});

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // Regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // Regex for password

// Middleware
server.use(express.json());
server.use(cors());

mongoose.connect(process.env.DB_LOCATION, {
    autoIndex: true
});

// Setting up S3 bucket
const s3 = new aws.S3({
    region: 'ap-south-1', // Specify your S3 bucket region
    accessKeyId: process.env.AWS_ACCESS_KEY, // Access key ID from environment variables
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY // Secret access key from environment variables
});

const generateUploadURL = async () => {
    const date = new Date();
    const imageName = `${nanoid()}-${date.getTime()}.jpeg`;

    return await s3.getSignedUrlPromise('putObject', {
        Bucket: 'blog-kpp',
        Key: imageName,
        Expires: 1000,
        ContentType: "image/jpeg" // Removed slash from the beginning of the string
    });
};

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
        // If no token is provided, return a 401 Unauthorized status
        return res.status(401).json({ error: "No access token" });
    }
    jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
        if (err) {
            // If the token is invalid, return a 403 Forbidden status
            return res.status(403).json({ error: "Access token invalid" });
        }
        // Set the user ID in the request object for use in subsequent middleware/routes
        req.user = user.id;
        next();
    });
};

const formatDatatoSend = (user) => {
    const access_token = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY);
    return {
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname
    };
};

const generateUsername = async (email) => {
    let username = email.split('@')[0];

    let isUsernameNotUnique = await User.exists({ "personal_info.username": username }).then((result) => result);
    isUsernameNotUnique ? username += nanoid().substring(0, 5) : "";
    return username;
};

// Upload image URL route
server.get('/get-upload-url', async (req, res) => {
    try {
        const url = await generateUploadURL();
        res.status(200).json({ uploadURL: url });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ error: err.message });
    }
});

server.post("/signup", (req, res) => {
    let { fullname, email, password } = req.body;

    // Data Validation Frontend
    if (fullname.length < 3) {
        return res.status(403).json({ "error": "Fullname must be at least 3 letters long" });
    }
    if (!email.length) {
        return res.status(403).json({ "error": "Email is required" });
    }
    if (!emailRegex.test(email)) {
        return res.status(403).json({ "error": "Email is Invalid" });
    }
    if (!passwordRegex.test(password)) {
        return res.status(403).json({ "error": "Password should be 6 to 20 letters long with numeric, 1 uppercase and 1 lowercase character" });
    }

    bcrypt.hash(password, 10, async (err, hashed_password) => {
        let username = await generateUsername(email);

        let user = new User({
            personal_info: { fullname, email, password: hashed_password, username }
        });

        user.save().then((u) => {
            return res.status(200).json(formatDatatoSend(u));
        })
        .catch(err => {
            if (err.code == 11000) {
                return res.status(500).json({ "error": "Email already exists" });
            }
            return res.status(500).json({ "error": err.message });
        });
    });
});

server.post("/signin", (req, res) => {
    let { email, password } = req.body;

    User.findOne({ "personal_info.email": email })
    .then((user) => {
        if (!user) {
            return res.status(403).json({ "error": "Email does not exist" });
        }

        if (!user.google_auth) {
            bcrypt.compare(password, user.personal_info.password, (err, result) => {
                if (err) {
                    return res.status(403).json({ "error": "Error occurred while login" });
                }

                if (!result) {
                    return res.status(403).json({ "error": "Incorrect password" });
                } else {
                    return res.status(200).json(formatDatatoSend(user));
                }
            });
        } else {
            return res.status(403).json({ "error": "Account was created using Google. Please use Google login" });
        }
    })
    .catch(err => {
        console.log(err.message);
        return res.status(500).json({ "error": err.message });
    });
});

server.post("/google-auth", async (req, res) => {
    let { access_token } = req.body;

    getAuth()
    .verifyIdToken(access_token)
    .then(async (decodedUser) => {
        let { email, name, picture } = decodedUser;

        picture = picture.replace("s96-c", "s384-c");

        let user = await User.findOne({ "personal_info.email": email }).select("personal_info.fullname personal_info.username personal_info.profile_img google_auth").then((u) => {
            return u || null;
        })
        .catch(err => {
            return res.status(500).json({ "error": err.message });
        });

        if (user) { // Login
            if (!user.google_auth) {
                return res.status(403).json({ "error": "This email" });
            }
        } else { // Sign up
            let username = await generateUsername(email);

            user = new User({
                personal_info: {
                    fullname: name, email, 
                    // profile_img: picture, // Uncomment this if you want to save the profile image URL
                    username
                },
                google_auth: true
            });

            await user.save().then((u) => {
                user = u;
            })
            .catch(err => {
                return res.status(500).json({ "error": err.message });
            });
        }

        return res.status(200).json(formatDatatoSend(user));
    })
    .catch(err => {
        return res.status(500).json({ "error": "Failed to authenticate. Try with some other Google account" });
    });
});

 

server.post('/latest-blogs', (req, res) =>{

    let { page } = req.body;

    let maxLimit = 5;

    Blog.find({ draft: false })
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id ")
    .sort({"publishedAt": -1})
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then(blogs =>{
        return res.status(200).json({ blogs })
    })
    .catch(err =>{
        return res.status(500).json({error: err.message})
    })
})


server.post("/all-latest-blogs-count", (req, res) =>{
    Blog.countDocuments( { draft: false } )
    .then(count =>{
        return res.status(200).json({ totalDocs: count })
    })
    .catch(err =>{
        console.log(err.message);
        return res.status(500).json({ error: err.message })
    })
})


server.get("/trending-blogs",(req, res) =>{

    Blog.find({ draft: false})
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({"activity.total_read": -1, "activity.total_likes": -1, "publishedAt": -1})
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then(blogs =>{
        return res.status(200).json({ blogs })
    })
    .catch(err =>{
        return res.status(500).json({error: err.message})
    })
})

server.post("/search-blogs", (req, res) => {
    let { tag, query, author, page, limit, eliminate_blog } = req.body;

    let findQuery;

    if(tag){
        findQuery = { tags: tag, draft: false, blog_id: {$ne: eliminate_blog} };
    }else if(query) {
        findQuery ={ draft: false, title: new RegExp(query,'i') }
    }else if (author){
        findQuery = { author, draft: false };
    }

    let maxLimit = limit ? limit : 2;

    Blog.find(findQuery)
        .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({ "publishedAt": -1 })
        .select("blog_id title des banner activity tags publishedAt -_id")
        .skip((page - 1) * maxLimit)
        .limit(maxLimit)
        .then(blogs => {
            console.log("Find Query:", findQuery);
            return res.status(200).json({ blogs });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});

server.post("/search-blogs-count", (req, res) =>{

    let { tag, author, query } = req.body;

    let findQuery;

    if(tag){
        findQuery = { tags: tag, draft: false };
    }else if(query) {
        findQuery ={ draft: false, title: new RegExp(query,'i') }
    }else if (author){
        findQuery = { author, draft: false };
    }
    
    Blog.countDocuments(findQuery)
    .then(count =>{
        return res.status(200).json({ totalDocs: count })
    })
    .catch(err =>{
        console.log(err.message)
        return res.status(500).json({ error: err.message })
        })


})

server.post("/search-users", (req, res)=>{
    let { query } = req.body;
    User.find({"personal_info.username": new RegExp(query, 'i')})
    .limit(50)
    .select("personal_info.fullname personal_info.username personal_info.profile_img -_id")
    .then(users =>{
        return res.status(200).json({ users })
    })
    .catch(err =>{
        return res.status(500).json({error: err.message })
    })
})

server.post("/get-profile", (req, res) =>{
let { username } = req.body;
User.findOne({ "personal_info.username": username })
.select("-personal_info.password -google_auth -updatedAt -blogs")
.then(user =>{
    return res.status(200).json(user)
})
.catch(err =>{
    console.log(err)
    return res.status(500).json({ error: err.message })
})

})


server.post('/create-blog', verifyJWT, (req, res) => {
    let authorID = req.user;

  

    let { title, des, banner, tags, content, draft, id } = req.body;

    if (!title || title.length === 0) {
        return res.status(403).json({ error: "Title is required" });
    }

    if(!draft){
        if (!des || des.length === 0 || des.length > 200) {
            return res.status(403).json({ error: "Description is required and should be less than 200 words" });
        }
        if (!banner || banner.length === 0) {
            return res.status(403).json({ error: "Banner is required" });
        }
        if (!content || !content.blocks || content.blocks.length === 0) {
            return res.status(403).json({ error: "Content is required" });
        }
        if (!tags || tags.length === 0 || tags.length > 10) {
            return res.status(403).json({ error: "Tags are required and should be less than 10" });
        }
    }

   
    

    tags = tags.map(tag => tag.toLowerCase());
     
    let blog_id = id || title
        .replace(/[^a-zA-Z0-9\s]/g, '')  
        .replace(/\s+/g, '-')            
        .trim()                          
        + nanoid();                      

        if(id){
            Blog.findOneAndUpdate({blog_id}, { title, des,banner,content, tags,draft: draft ? draft : false })
            .then(() =>{
                return res.status(200).json({ id: blog_id })
            })
            .catch(err =>{
                return res.status(500).json({ error: err.message })
            })


        }else{
            let blog = new Blog({
                title, des, banner, content, tags, author: authorID, blog_id, draft: Boolean(draft)
            });
        
            blog.save()
                .then(blog => {
                    let incrementVal = draft ? 0 : 1;
                    return User.findOneAndUpdate(
                        { _id: authorID },
                        { $inc: { "account_info.total_posts": incrementVal }, $push: { blogs: blog._id } },
                        { new: true }
                    );
                })
                .then(user => {
                    return res.status(200).json({ id: blog.blog_id });
                })
                .catch(err => {
                    return res.status(500).json({ error: "Failed to update total number of Posts" });
                });        
        }

    
});

server.post("/get-blog", (req, res) => {
    let { blog_id, draft, mode } = req.body;

    let incrementVal = mode != 'edit' ? 1: 0;

    Blog.findOneAndUpdate({ blog_id }, { $inc: { "activity.total_reads": incrementVal } }, { new: true }) // { new: true } to return the updated document
        .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img") // Combine fields into a single string
        .select("title des content banner activity publishedAt blog_id tags")
        .then(blog => {

            User.findOneAndUpdate({ "personal_info.username": blog.author.personal_info.username },
                { $inc: { "account_info.total_reads": incrementVal }
        })
        .catch(err =>{
            return res.status(500).json({ error: err.message });
        })
        if(blog.draft && !draft){
            return res.status(500).json({ error: "you can not access draft blogs" });
        }
        return res.status(200).json({ blog });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});


server.post("/like-blog", verifyJWT, (req, res) => {
    let user_id = req.user;
    let { _id, islikedByUser } = req.body;
    let incrementVal = !islikedByUser ? 1 : -1;

    Blog.findOneAndUpdate({ _id }, { $inc: { "activity.total_likes": incrementVal } })
        .then(blog => {
            if (!islikedByUser) {
                let like = new Notification({
                    type: "like",
                    blog: _id,
                    notification_for: blog.author,
                    user: user_id
                });

                return like.save().then(notification => {
                    res.status(200).json({ liked_by_user: true });
                });
            } else {
                Notification.findOneAndDelete({ user: user_id, blog: _id, type: "like" })
                    .then(data => {
                        res.status(200).json({ liked_by_user: false });
                    })
                    .catch(err => {
                        return res.status(500).json({ error: err.message });
                    });
            }
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});


server.post("/isliked-by-user", verifyJWT, (req, res) => {
    let user_id = req.user;
    let { _id } = req.body;

    Notification.exists({ user: user_id, type: "like", blog: _id })
    .then(result => {
        return res.status(200).json({ result });
    })
    .catch(err => {
        return res.status(500).json({ error: err.message });
    });
});


server.post("/add-comment", verifyJWT, (req, res) => {
    let user_id = req.user;
    let { _id, comment, blog_author, replying_to } = req.body;

    if (!comment.length) {
        return res.status(403).json({ error: "Write something to leave a comment" });
    }
    
    // Creating Comment
    let commentObj = {
        blog_id: _id, 
        blog_author, 
        comment, 
        commented_by: user_id
    };
    if (replying_to) {
        commentObj.parent = replying_to;
        commentObj.isReply = true;
    }

    new Comment(commentObj).save().then(async commentFile => {
        let { comment, commentedAt, children } = commentFile;
        Blog.findOneAndUpdate(
            { _id }, 
            { 
                $push: { "comments": commentFile._id },
                $inc: { 
                    "activity.total_comments": 1, 
                    "activity.total_parent_comments": replying_to ? 0 : 1 
                } 
            }
        ).then(blog => {
            console.log("New comment created");
        });

        let notificationObj = {
            type: replying_to ? "reply" : "comment",
            blog: _id,
            notification_for: blog_author,
            user: user_id,
            comment: commentFile._id
        };

        if (replying_to) {
            notificationObj.replied_on_comment = replying_to;

            await Comment.findOneAndUpdate(
                { _id: replying_to }, 
                { $push: { children: commentFile._id } }
            ).then(replyingToCommentDoc => {
                notificationObj.notification_for = replyingToCommentDoc.commented_by;
            });
        }

        new Notification(notificationObj).save().then(notification => {
            console.log("New notification created");
        });

        return res.status(200).json({ comment, commentedAt, _id: commentFile._id, user_id, children });
    }).catch(err => {
        console.error(err);
        return res.status(500).json({ error: "An error occurred while saving the comment." });
    });
});


server.post("/get-blog-comments",(req, res ) =>{
    let { blog_id, skip } = req.body;
    let maxLimit = 5;

    Comment.find({ blog_id, isReply: false })
    .populate("commented_by", "personal_info.username personal_info.fullname personal_info.profile_img")
    .skip(skip)
    .limit(maxLimit)
    .sort({
        'commentedAt': -1
    })
    .then(comment =>{
        return res.status(200).json(comment);
    })
    .catch(err =>{
        console.log(err.message)
        return res.status(500).json({error: err.message})
    })

})

server.post("/get-replies", (req, res)=>{
    let { _id, skip } = req.body;
    let maxLimit = 5;

    Comment.findOne({_id})
    .populate({
        path: "children",
        options: {
            limit: (maxLimit),
            skip: skip,
            sort: { 'commentedAt': -1 }
        },
        populate: {
            path: "commented_by",
            select: "personal_info.username personal_info.fullname personal_info.profile_img"

        },
        select: "-blog_id -updatedAt"

    })
    .select("children")
    .then(doc => {
        console.log(doc);
        return res.status(200).json({replies: doc.children})
    })
    .catch(err =>{
        return res.status(500).json({error: err.message})
    })
})


const deleteComments = (_id) =>{
    Comment.findOneAndDelete({_id})
    .then(comment =>{
        if(comment.parent){
            Comment.findOneAndUpdate({_id: comment.parent_}, {$pull: { children: _id }})
            .then(data => console.log("comment deleted"))
            .catch(err => console.log(err))
        }

        Notification.findOneAndDelete({comment: _id}).then(notification => console.log('comment notification deleted'))
        Notification.findOneAndDelete({reply: _id}).then(notification => console.log('reply deleted'))

        Blog.findOneAndUpdate({ _id: comment.blog_id},{ $pull: { comments: _id }, $inc: { "activity.total_comments": -1 }, "activity.total_parent_comments": comment.parent ? 0 : -1  })
        .then(blog => {
            if(comment.children.length){
                comment.children.map(replies=>{
                    deleteComments(replies)
                })
            }
        })

    })
    .catch(err => {
        console.log(err.message)
    })
}



server.post("/delete-comment", verifyJWT,(req, res)=>{

    let user_id = req.user;

    let { _id } = req.body;

    Comment.findOne({_id})
    .then(comment =>{
        if (user_id == comment.commented_by || user_id == comment.blog_author){
            deleteComments(_id)   

            return res.status(200).json({status: 'done'});
        }else{
            return res.status(403).json({error: "you can not delete this comment"})
        }
    })

})

server.listen(PORT, () => {
    console.log('listening on port >' + PORT);
});
