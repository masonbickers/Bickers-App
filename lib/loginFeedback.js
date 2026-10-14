export function getLoginFeedback(error) {
  const code = error?.code;
  if (["auth/wrong-password", "auth/invalid-credential", "auth/invalid-login-credentials"].includes(code)) {
    return { title: "Wrong password", message: "Please try again or tap Forgot password?" };
  }
  if (["auth/invalid-email", "auth/user-not-found"].includes(code)) {
    return { title: "Check your email", message: "Enter your work email and try again." };
  }
  if (code === "auth/too-many-requests") {
    return { title: "Too many attempts", message: "Please wait a few minutes before trying again." };
  }
  if (code === "auth/user-disabled") {
    return { title: "Account disabled", message: "Contact a Bickers administrator to restore your access." };
  }
  if (error?.status === 403) {
    if (error.message === "Mobile app access has not been approved.") {
      return { title: "Access approval required", message: "Ask a Bickers administrator to approve Mobile app access." };
    }
    return { title: "Unable to verify access", message: "Contact a Bickers administrator to check your account access." };
  }
  return { title: "Unable to sign in", message: "We couldn't complete sign in. Check your connection and try again." };
}
