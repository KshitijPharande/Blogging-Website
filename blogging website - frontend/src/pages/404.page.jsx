import { Link } from "react-router-dom";
import fullLogo from "../imgs/full-logo.png";
import pageNotFoundImage from "../imgs/404.png";

const PageNotFound = () => {
    return (
        <section className="h-cover relative p-10 flex flex-col items-center gap-20 text-center">
            <img 
                src={pageNotFoundImage} 
                alt="Page Not Found" 
                className="select-none border-2 border-grey w-72 aspect-square object-cover rounded" 
            />
            <h1 className="text-4xl font-gelasio leading-7">Page Not Found</h1>
            <p className="text-dark-grey text-xl leading-7 -mt-8">
                The page you are looking for does not exist. Please head back to the 
                <Link to="/" className="text-block underline"> Home Page</Link>
            </p>

            <div className="mt=auto">
                <img src ={fullLogo} className="h-8 object-contain block mx-auto select-none" />
                <p className="mt-5 text-dark-grey"> Read Millions of Stories Around the World</p>
            </div>
        </section>
    );
}

export default PageNotFound;
