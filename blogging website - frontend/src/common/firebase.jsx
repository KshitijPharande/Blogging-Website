
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup} from 'firebase/auth'




const firebaseConfig = {
  apiKey: "AIzaSyDA3-YNH-ZSnx28khV8wZFEEnCKRuTC7AE",
  authDomain: "blogging-website-mern.firebaseapp.com",
  projectId: "blogging-website-mern",
  storageBucket: "blogging-website-mern.appspot.com",
  messagingSenderId: "402899901337",
  appId: "1:402899901337:web:372de0c846b64339ac9108"
};


const app = initializeApp(firebaseConfig);

//google auth

const provider = new GoogleAuthProvider();

const auth = getAuth();


export const authWithGoogle = async () =>{
    let user = null;

    await signInWithPopup (auth, provider)
    .then((result) =>{
        user = result.user
    })
    .catch((error) => {
        console.log(err)
        })
    return user;
}