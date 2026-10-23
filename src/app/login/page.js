import LoginClient from "@/components/LoginClient";

export const metadata = {
  title: "Direct Club Login | Bugeese Pure Veg",
  description: "Sign in to Bugeese Direct Ordering Club to access commission-avoided headroom discounts and loyalty perks."
};

export default function LoginPage() {
  return (
    <main className="flex-1 bg-[#17130F]">
      <LoginClient />
    </main>
  );
}
