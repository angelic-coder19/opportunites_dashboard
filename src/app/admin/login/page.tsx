// src/app/admin/login/page.tsx
// Server shell for the admin login page. The form itself is a client component
// so we can manage the password input and error state inline.

import LoginForm from "./LoginForm";

export const metadata = {
  title: "Admin Login | UAPB RIED",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next ?? "/admin";
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <p className="font-display text-3xl tracking-widest uppercase text-black">
            UAPB RIED
          </p>
          <p className="font-heading mt-1 text-[11px] tracking-widest uppercase text-gray-500">
            Admin Console
          </p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
