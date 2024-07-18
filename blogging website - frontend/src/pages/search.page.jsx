import { useParams } from "react-router-dom";
import InPageNavigation from "../components/inpage-navigation.component";
import { useEffect, useState } from "react";
import Loader from "../components/loader.component";
import AnimationWrapper from "../common/page-animation";
import BlogPostCard from "../components/blog-post.component";
import LoadMoreDataBtn from "../components/load-more.component"
import NoDataMessage from "../components/nodata.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import axios from 'axios';

const SearchPage = () => {
    const { query } = useParams();
    const [blogs, setBlog] = useState(null);

    const SearchBlogs = async ({ page = 1, create_new_arr = false }) => {
        try {
            const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", { query, page });
            console.log(data.blogs);

            const formatedData = await filterPaginationData({
                state: blogs,
                data: data.blogs,
                page,
                countRoute: "/search-blogs-count",
                data_to_send: { query },
                create_new_arr
            });

            console.log(formatedData);
            setBlog(formatedData);
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        resetState();
        SearchBlogs({ page: 1, create_new_arr: true });
    }, [query]);

    const resetState = () =>{
        setBlog(null);
    }

    return (
        <section className="h-cover flex justify-center gap-10">
            <div className="w-full">
                <InPageNavigation routes={[`Search Results for "${query}"`, "Accounts Matched"]} defaultHidden={["Accounts Matched"]}>
                    <>
                        {blogs == null ? (
                            <Loader />
                        ) : (
                            blogs.results.length ? (
                                blogs.results.map((blog, i) => (
                                    <AnimationWrapper transition={{ duration: 1, delay: i * 0.1 }} key={i}>
                                        <BlogPostCard content={blog} author={blog.author.personal_info} />
                                    </AnimationWrapper>
                                ))
                            ) : (
                                <NoDataMessage message="No Blogs Published" />
                            )
                        )}
                        <LoadMoreDataBtn state={blogs} fetchDataFun={SearchBlogs} />
                        
                    </>
                </InPageNavigation>
            </div>
        </section>
    );
};

export default SearchPage;
