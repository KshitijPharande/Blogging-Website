import { useParams } from "react-router-dom";
const BlogPage = () =>{

    let {blog_id } = useParams()

    return(
        <h1> This is Blogid {blog_id} </h1>
        

    )


}

export default BlogPage;