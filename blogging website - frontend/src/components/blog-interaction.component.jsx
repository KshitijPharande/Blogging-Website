import { useContext } from "react"
import { BlogContext } from "../pages/blog.page"
import { Link } from "react-router-dom"
import {UserContext} from "../App"
import { Toaster, toast } from "react-hot-toast"
const BlogIntereaction = () =>{
    let {blog, blog: {title, blog_id, activity, activity: {total_likes, total_comments},
author: {personal_info: {username: author_username }}}, setBlog, islikedByUser, setLikedByUser  } = useContext(BlogContext);


let {userAuth: { username, access_token }} = useContext(UserContext);


const handleLike =() =>{

    if(access_token){
        setLikedByUser(preVal =>!preVal);
        !islikedByUser ? total_likes++ :
        total_likes--;

        setBlog({ ...blog, activity: {...activity, total_likes}})
        console.log(islikedByUser)
    }else{
        console.log('not logged in')
        toast.error("Please login to like this blog")
    }

}
    return(
        <>
        <Toaster />
        <hr className="border-grey my-2" />
        <div className="flex gap-6 justify-between">
            <div className="flex gap-3 items-center">
                <button
                onClick={handleLike}
                className={"w-10 h-10 rounded-full flex items-center justify-center " + ( islikedByUser ? "bg-red/20 text-red" : "bg-grey/80" )}>
                    <i className={"fi " + ( islikedByUser ? "fi-sr-heart" : "fi-rr-heart"  )}></i>
                </button>
                <p className="text-xl text-dark-grey">{total_likes}</p>
    
                <button className="w-10 h-10 rounded-full flex items-center justify-center bg-grey/80">
                    <i className="fi fi-rr-comment"></i>
                </button>
                <p className="text-xl text-dark-grey">{total_comments}</p>
            </div>
            <div className="flex gap-6 items-center">
            {
                username == author_username ?
                <Link to= {`/editor/${blog_id}`}className="underline hover:text-purple">Edit</Link>
                : ""

            }


            <Link to={`https://twitter.com/intent/tweet?text=Read%20${encodeURIComponent(title)}&url=${encodeURIComponent(window.location.href)}`}>
                <i className="fi fi-brands-twitter text-xl hover:text-twitter"></i>
                </Link>
            </div>
        </div>
        <hr className="border-grey my-2" />
    </>
    
    )
}

export default BlogIntereaction