import { SigninForm } from "@/components/auth/signin-form"

const SignInPage = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_30%),radial-gradient(circle_at_bottom_right,#ccfbf1,transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_48%,#ecfeff_100%)] px-4 py-10">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.02),rgba(59,130,246,0.08),rgba(20,184,166,0.08))]" />
      <div className="relative w-full max-w-5xl">
        <SigninForm />
      </div>
    </div>
  )
}

export default SignInPage
