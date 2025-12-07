export const parseFirebaseError = (error: any): string => {
  const code = error?.code || error; 

  switch (code) {

    // 🔹 INVALID EMAIL
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Please enter a valid email address.";

    // 🔹 INVALID LOGIN
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Email or password is incorrect.";

    // 🔹 USER NOT FOUND
    case "auth/user-not-found":
      return "No account found with this email.";

    // 🔹 WRONG PASSWORD
    case "auth/wrong-password":
      return "Incorrect password. Try again.";

    // 🔹 EMAIL EXISTS
    case "auth/email-already-in-use":
      return "This email is already registered.";

    // 🔹 MISSING PASSWORD
    case "auth/missing-password":
      return "Please enter a password.";

    // 🔹 WEAK PASSWORD
    case "auth/weak-password":
      return "Password should be at least 8 characters, include an uppercase letter, a number, and a special character.";

    // 🔹 TOO MANY ATTEMPTS
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";

    // 🔹 NETWORK ISSUE
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";

    // 🔹 DEFAULT
    default:
      return "Something went wrong. Please try again.";
  }
};
