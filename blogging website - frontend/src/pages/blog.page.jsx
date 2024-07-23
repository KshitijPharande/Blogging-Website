import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import { Link } from "react-router-dom";
import { getDay, getFullDay } from "../common/date";
import BlogIntereaction from "../components/blog-interaction.component";

export const blogStructure = {
    title: '',
    des: '',
    content: [],
    tags: [],
    author: { personal_info: {} },
    banner: '',
    publishedAt: '',
}

const BlogPage = () => {
    let { blog_id } = useParams();

    const [blog, setBlog] = useState(blogStructure);
    const [loading, setLoading] = useState(true);

    const { title, content, banner, author: { personal_info: { fullname, username: author_username, profile_img } }, publishedAt } = blog;

    const fetchBlog = () => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-blog", { blog_id })
            .then(({ data: { blog } }) => {
                setBlog(blog);
                setLoading(false);
            })
            .catch(err => {
                console.log(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchBlog();
    }, []);

    return (
        <AnimationWrapper>
            {loading ? <Loader /> : (
                <div className="max-w-[900px] center py-10 max-lg:px-5[5vw]">
                    <img src={banner} className="aspect-video" alt="Blog Banner" />
                    <div className="mt-12">
                        <h1 className="text-3xl font-bold">{title}</h1>
                        <div className="flex max-sm:flex-col justify-between my-8">
                            <div className="flex gap-5 items-start">
                                <img src={profile_img} className="w-12 h-12 rounded-full" alt="Author" />
                                <p className="capitalize">
                                    {fullname}
                                    <br />
                                    @
                                    <Link to={`/user/${author_username}`} className="underline">{author_username}</Link>
                                </p>
                            </div>
                            <p className="text-dark-grey opacity-75 max-sm:mt-6
                            max-sm:ml-12 max-sm: pl-5">
                                Published on {getDay(publishedAt)}
                            </p>
                        </div>
                    </div>
                    <BlogIntereaction/>
                </div>
            )}
        </AnimationWrapper>
    );
};

export default BlogPage;
