"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-[#1E3A5F] p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Licen-sure
        </Link>
        <div className="space-x-4">
          {session ? (
            <>
              <Link href="/dashboard" className="hover:text-gray-300">
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-3 py-1 rounded-md bg-white border border-[#CBD5E1] text-[#1E3A5F] hover:bg-[#F1F5F9] transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-[#F1F5F9]">
                Login
              </Link>
              <Link href="/register" className="hover:text-[#F1F5F9]">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
