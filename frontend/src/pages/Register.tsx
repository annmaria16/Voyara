import AuthLayout from "../components/AuthLayout";
import RegisterForm from "../components/RegisterForm";
import SocialLogin from "../components/SocialLogin";

export default function Register() {
  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start using VeriNova outcome verification"
    >
      <RegisterForm />
      <SocialLogin dividerText="or sign up with" />
    </AuthLayout>
  );
}
