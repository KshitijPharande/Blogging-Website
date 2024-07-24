import { Toaster, toast } from "react-hot-toast";
import AnimationWrapper from "../common/page-animation";
import { useContext } from "react";
import { EditorContext } from "../pages/editor.pages";
import Tag from "./tags.component";
import { UserContext } from "../App";
import { useNavigate, useParams } from "react-router-dom";
import axios from 'axios'; // Added Axios import

const PublishForm = () => {
    const CharacterLimit = 200;
    const tagLimit = 10;

    const { blog_id } = useParams();

    const { blog, blog: { banner, title, tags, des, content }, setEditorState, setBlog } = useContext(EditorContext);
    const { userAuth: { access_token } } = useContext(UserContext);

    const navigate = useNavigate();

    const handleCloseEvent = () => {
        setEditorState("editor");
    };

    const handleBlogTitleChange = (e) => {
        setBlog({ ...blog, title: e.target.value });
    };

    const handleBlogDesChange = (e) => {
        setBlog({ ...blog, des: e.target.value });
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = e.target.value.trim();

            if (tags.length < tagLimit && tag && !tags.includes(tag)) {
                setBlog({ ...blog, tags: [...tags, tag] });
                e.target.value = "";
            } else if (tags.length >= tagLimit) {
                toast.error("You can only add 10 tags");
            }
        }
    };

    const publishBlog = (e) => {
        if (e.target.classList.contains("disable")) return;

        if (!title) {
            toast.error("Please enter a title");
            return;
        }
        if (!des || des.length > CharacterLimit) {
            toast.error("Description cannot be blank and should be under 200 characters");
            return;
        }
        if (!tags.length) {
            toast.error("Please add at least one tag");
            return;
        }

        const loadingToast = toast.loading("Publishing...");
        e.target.classList.add('disable');

        const blogObj = {
            title, banner, des, content, tags, draft: false
        };

        axios.post(`${import.meta.env.VITE_SERVER_DOMAIN}/create-blog`, { ...blogObj, id: blog_id }, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        .then(() => {
            e.target.classList.remove('disable');
            toast.dismiss(loadingToast);
            toast.success("Blog Published Successfully 👍");
            setTimeout(() => {
                navigate("/");
            }, 500);
        })
        .catch(({ response }) => {
            e.target.classList.remove('disable');
            toast.dismiss(loadingToast);
            toast.error(response.data.error);
        });
    };

    return (
        <AnimationWrapper>
            <section className="w-screen min-h-screen grid items-center lg:grid-cols-2 py-16 lg:gap-4">
                <Toaster />
                <button
                    className="w-12 h-12 absolute right-[5vw] z-10 top-[5%] lg:top-[10%]"
                    onClick={handleCloseEvent}
                >
                    <i className="fi fi-br-cross"></i>
                </button>

                <div className="max-w-[550px] center">
                    <p className="text-dark-grey mb-1">Preview</p>
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-grey mt-4">
                        <img src={banner} alt="Blog Banner" />
                    </div>
                    <h1 className="text-4xl font-medium mt-2 leading-tight line-clamp-2">{title}</h1>
                    <p className="font-gelasio line-clamp-2 text-xl leading-7 mt-4">{des}</p>
                </div>

                <div className="border-grey lg:border-1 lg:pl-8">
                    <p className="text-dark-grey mb-2 mt-9">Blog Title</p>
                    <input
                        type="text"
                        placeholder="Blog Title"
                        defaultValue={title}
                        className="input-box pl-4"
                        onChange={handleBlogTitleChange}
                    />

                    <p className="text-dark-grey mb-2 mt-9">Short Description About Your Blog</p>
                    <textarea
                        maxLength={CharacterLimit}
                        defaultValue={des}
                        className="h-40 resize-none leading-7 input-box pl-4"
                        onChange={handleBlogDesChange}
                        onKeyDown={handleTitleKeyDown}
                    />
                    <p className="mt-1 text-dark-grey text-sm text-right">{CharacterLimit - des.length} Characters Left</p>

                    <p className="text-dark-grey mb-2 mt-9">Topics - (Helps in Searching and Ranking Your Blog Post)</p>
                    <div className="relative input-box pl-2 py-2 pb-4">
                        <input
                            type="text"
                            placeholder="Topics"
                            className="sticky input-box bg-white top-0 left-0 pl-4 mb-3 focus:bg-white"
                            onKeyDown={handleKeyDown}
                        />
                        {tags.map((tag, i) => (
                            <Tag tag={tag} tagIndex={i} key={i} />
                        ))}
                    </div>
                    <p className="mt-1 mb-4 text-dark-grey text-right">{tagLimit - tags.length} Tags Left</p>

                    <button className="btn-dark px-8" onClick={publishBlog}>
                        Publish
                    </button>
                </div>
            </section>
        </AnimationWrapper>
    );
};

export default PublishForm;
