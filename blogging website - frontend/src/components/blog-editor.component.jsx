import { Link, useNavigate, useParams } from "react-router-dom";
import logo from "../imgs/logo.png";
import AnimationWrapper from "../common/page-animation";
import defaultBanner from "../imgs/blog banner.png";
import { uploadImage } from "../common/aws";
import { useContext, useEffect } from "react";
import { EditorContext } from "../pages/editor.pages";
import { Toaster, toast } from "react-hot-toast";
import EditorJS from "@editorjs/editorjs";
import { tools } from "./tools.component";
import { UserContext } from "../App";
import axios from "axios"; // Import axios if not already imported

const BlogEditor = () => {
    let { blog, setBlog, textEditor, setTextEditor, setEditorState } = useContext(EditorContext);
    let { userAuth: { access_token } } = useContext(UserContext);
    let {blog_id} = useParams();
    let navigate = useNavigate();

    useEffect(() => {
        if (!textEditor.isReady) {
            setTextEditor(new EditorJS({
                holderId: "textEditor",
                data: Array.isArray(blog.content)? blog.content[0] : blog.content,
                tools: tools,
                placeholder: "Let's Write an Awesome Story"
            }));
        }
    }, []);

    const handleBannerUpload = (e) => {
        let img = e.target.files[0];

        if (img) {
            let loadingToast = toast.loading("Uploading...");

            uploadImage(img).then((url) => {
                if (url) {
                    toast.dismiss(loadingToast);
                    toast.success("Uploaded");
                    setBlog({ ...blog, banner: url });
                }
            }).catch(err => {
                console.log(err);
            });
        }
    };

    const handleTitleKeyDown = (e) => {
        if (e.keyCode === 13) {
            e.preventDefault();
        }
    };

    const handleTitleChange = (e) => {
        let input = e.target;
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
        setBlog({ ...blog, title: input.value });
    };

    const handleError = (e) => {
        let img = e.target;
        img.src = defaultBanner;
    };

    const handlePublishEvent = () => {
        if (!blog.banner.length) {
            return toast.error("Upload Blog banner to publish");
        }

        if (!blog.title.length) {
            return toast.error("Enter Blog title to publish");
        }

        if (textEditor.isReady) {
            textEditor.save().then(data => {
                if (data.blocks.length) {
                    setBlog({ ...blog, content: data });
                    setEditorState("publish");
                } else {
                    toast.error("Enter Blog content to publish");
                }
            }).catch((err) => {
                console.log(err);
            });
        }
    };

    const handleSaveDraft = (e) => {
        if (e.target.classList.contains("disable")) {
            return;
        }

        if (!blog.title.length) {
            toast.error("Please enter a title to Save as Draft");
            return;
        }

        let loadingToast = toast.loading("Saving Draft...");
        e.target.classList.add('disable');

        if (textEditor.isReady) {
            textEditor.save().then(content => {
                let blogObj = {
                    title: blog.title,
                    banner: blog.banner,
                    des: blog.des,
                    content: content,
                    tags: blog.tags,
                    draft: true
                };

                axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/create-blog", {...blogObj, id: blog_id}, {
                    headers: {
                        'Authorization': `Bearer ${access_token}`
                    }
                }).then(() => {
                    e.target.classList.remove('disable');
                    toast.dismiss(loadingToast);
                    toast.success("Saved");
                    setTimeout(() => {
                        navigate("/dashboard/blogs?tab=draft");
                    }, 500);
                }).catch(({ response }) => {
                    e.target.classList.remove('disable');
                    toast.dismiss(loadingToast);
                    toast.error(response.data.error);
                });
            }).catch((err) => {
                console.log(err);
            });
        }
    };

    return (
        <>
            <nav className="navbar">
                <Link to="/" className="flex-none w-10">
                    <img src={logo} alt="Logo" />
                </Link>
                <p className="max-md:hidden text-black line-clamp-1 w-full">
                    {blog.title.length ? blog.title : "New Blog"}
                </p>
                <div className="flex gap-4 ml-auto">
                    <button className="btn-dark py-2" onClick={handlePublishEvent}>
                        Publish
                    </button>
                    <button className="btn-dark py-2" onClick={handleSaveDraft}>
                        Save draft
                    </button>
                </div>
            </nav>
            <Toaster />
            <AnimationWrapper>
                <section>
                    <div className="mx-auto max-w-[900px] w-full">
                        <div className="relative aspect-video hover:opacity-80 bg-white border-4 border-grey">
                            <label htmlFor="uploadBanner">
                                <img
                                    src={blog.banner}
                                    className="z-20"
                                    onError={handleError}
                                    alt="Blog Banner"
                                />
                                <input
                                    id="uploadBanner"
                                    type="file"
                                    accept=".png, .jpg, .jpeg"
                                    hidden
                                    onChange={handleBannerUpload}
                                />
                            </label>
                        </div>
                        <textarea
                            defaultValue={blog.title}
                            placeholder="Blog Title"
                            className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder-opacity-40"
                            onKeyDown={handleTitleKeyDown}
                            onChange={handleTitleChange}
                        />
                        <hr className="w-full opacity-10 my-5" />
                        <div id="textEditor" className="font-gelasio" />
                    </div>
                </section>
            </AnimationWrapper>
        </>
    );
};

export default BlogEditor;
