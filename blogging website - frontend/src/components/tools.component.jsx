import CodeTool from '@editorjs/code';
import Embed from '@editorjs/embed';
import Header from '@editorjs/header';
import ImageTool from '@editorjs/image';
import InlineCode from '@editorjs/inline-code';
import LinkTool from '@editorjs/link';
import List from '@editorjs/list';
import Marker from '@editorjs/marker';
import Quote from '@editorjs/quote';
import { uploadImage } from '../common/aws';

// Function to handle image upload by file
const uploadImageByFile = async (file) => {
    console.log("Uploading image file:", file);
    try {
        const url = await uploadImage(file); // Ensure this function returns a URL
        console.log("Image uploaded successfully, URL:", url);
        return {
            success: 1,
            file: { url }
        };
    } catch (err) {
        console.error("Image upload by file failed:", err);
        return {
            success: 0,
            error: "Image upload failed"
        };
    }
};

// Function to handle image upload by URL
const uploadImageByURL = (url) => {
    console.log("Uploading image by URL:", url);
    return Promise.resolve({
        success: 1,
        file: { url }
    });
};

export const tools = {
    embed: Embed,
    list: {
        class: List,
        inlineToolbar: true,
    },
    header: {
        class: Header,
        config: {
            placeholder: "Type Heading....",
            levels: [2, 3],
            defaultLevel: 2
        }
    },
    image: {
        class: ImageTool,
        config: {
            uploader: {
                uploadByURL: (url) => {
                    console.log("uploadByURL called with:", url);
                    return uploadImageByURL(url);
                },
                uploadByFile: (file) => {
                    console.log("uploadByFile called with:", file);
                    return uploadImageByFile(file);
                }
            }
        }
    },
    inlineCode: InlineCode,
    link: LinkTool,
    marker: Marker,
    quote: {
        class: Quote,
        inlineToolbar: true,
    },
    code: CodeTool
};
