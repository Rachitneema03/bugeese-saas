import AdminDashboardClient from "@/components/AdminDashboardClient";

export const metadata = {
  title: "Operations Console | Bugeese",
  description: "Bugeese Management and Superadmin Operations Console."
};

export default function AdminPage() {
  return (
    <main className="flex-1 bg-[#17130F]">
      <AdminDashboardClient />
    </main>
  );
}
