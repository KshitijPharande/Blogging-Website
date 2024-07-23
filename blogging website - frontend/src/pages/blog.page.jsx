import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export const blogStructure = {
    title: '',
    des: '',
    content: [],
    tags: [],
    author: {personal_info: {  } },
    banner: '',
    publishedAt: '',
}

const BlogPage = () => {
    let { blog_id } = useParams();

    const [blog, setBlog] = useState(blogStructure);

    let {title, content, banner,
     author: {personal_info: {fullname, username, profile_img}}, publishedAt} = blog;

    const fetchBlog = () => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-blog", { blog_id })
            .then(({ data: { blog } }) => {
                setBlog(blog);
            })
            .catch(err => {
                console.log(err);
            });
    };

    useEffect(() => {
        fetchBlog();
    }, []);

    return (
        <div>
            {blog ? (
                <h1>This is Blogid {blog.title}</h1>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
};

export default BlogPage;
