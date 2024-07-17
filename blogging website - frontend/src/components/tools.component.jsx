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

const uploadImageByFile = (e) => {
    return uploadImage(e).then(url => {
        if (url) {
            return {
                success: 1,
                file: { url }
            };
        }
    });
};

const uploadImageByURL = (e) => {
    let link = new Promise((resolve, reject) => {
        try {
            resolve(e);
        } catch (err) {
            reject(err);
        }
    })
    return link.then(url => {
        return {
            success: 1,
            file: { url }
        };
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
                uploadByURL: uploadImageByURL,
                uploadByFile: uploadImageByFile
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
