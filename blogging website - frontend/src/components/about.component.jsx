const AboutUser =({ className,bio, social_links, joinedAt}) =>{
    return(
       <div className={"md:w-[90%] md:mt-7 " + className}>
        <p className="text-xl leading-7">{bio.length ? bio : "Nothing to Read here" }</p>

        <div className="flex gap-x-7 gap-y-2 flex-wrap my-7 items-center
        text-dark-grey">
            

        </div>

       </div>
    )
}
export default AboutUser