// All callers share the same production or explicitly isolated emulator services.
import { GoogleAuthProvider } from "firebase/auth";
import { app, auth, db, storage } from "../firebaseConfig";
const googleProvider = new GoogleAuthProvider();
export { app, auth, db, googleProvider, storage };
