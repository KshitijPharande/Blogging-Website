import { useRef } from "react";
import AnimationWrapper from "../common/page-animation";
import InputBox from "../components/input.component";
import toast, { Toaster } from "react-hot-toast";

const ChangePassword = () => {
    let ChangePasswordForm = useRef();

    let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // Regex for password

    const handleSubmit = (e) => {
        e.preventDefault();

        let form = new FormData(ChangePasswordForm.current);
        let formData = {};

        for (let [key, value] of form.entries()) {
            formData[key] = value;
        }
        let { 'current-Password': currentPassword, newPassword } = formData;
        if (!currentPassword || !newPassword || !currentPassword.length || !newPassword.length) {
            return toast.error("Fill all the Inputs");
        }
        if(!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)){
            return toast.error("Password should be 6 to 20 characters long with a numeric , 1 lowercase and 1 uppercase letters ")
        }
    };

    return (
        <AnimationWrapper>
            <Toaster/>
            <form ref={ChangePasswordForm}>
                <h1 className="max-md:hidden">Change Password</h1>
                <div className="py-10 w-full md:max-w-[400px]">
                    <InputBox name="current-Password" type="password"
                        className="profile-edit-input" placeholder="Current Password" icon="fi fi-rr-unlock" />
                    <InputBox name="newPassword" type="password"
                        className="profile-edit-input" placeholder="New Password" icon="fi fi-rr-unlock" />
                    <button onClick={handleSubmit} className="btn-dark px-10">Change Password</button>
                </div>
            </form>
        </AnimationWrapper>
    );
}

export default ChangePassword;
