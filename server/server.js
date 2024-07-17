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

let maxLimit= 5;

server.get('/latest-blogs', (req, res) =>{
    Blog.find({ draft: false })
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id ")
    .sort({"publishedAt": -1})
    .select("blog_id title des banner activity tags publishedAt -_id")
    .limit(maxLimit)
    .then(blogs =>{
        return res.status(200).json({ blogs })
    })
    .catch(err =>{
        return res.status(500).json({error: err.message})
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
    let { tag } = req.body;

    let findQuery = { tags: tag, draft: false };

    let maxLimit = 5;

    Blog.find(findQuery)
        .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({ "publishedAt": -1 })
        .select("blog_id title des banner activity tags publishedAt -_id")
        .limit(maxLimit)
        .then(blogs => {
            console.log("Find Query:", findQuery);
            return res.status(200).json({ blogs });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});

server.post('/create-blog', verifyJWT, (req, res) => {
    let authorID = req.user;

  

    let { title, des, banner, tags, content, draft } = req.body;

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
     
    let blog_id = title
        .replace(/[^a-zA-Z0-9\s]/g, '')  
        .replace(/\s+/g, '-')            
        .trim()                          
        + nanoid();                      

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
});
server.listen(PORT, () => {
    console.log('listening on port >' + PORT);
});
