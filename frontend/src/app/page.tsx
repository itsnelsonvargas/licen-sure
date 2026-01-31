import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="bg-[#F8FAFC]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-semibold text-[#1E3A5F] leading-tight">
              Convert documents into focused quizzes for licensure preparation
            </h1>
            <p className="mt-4 text-gray-700 leading-relaxed max-w-2xl">
              Upload study materials and get calm, structured quizzes designed to help
              you focus, trust the process, and study longer.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                href="/register"
                className="px-6 py-3 rounded-md bg-[#1E3A5F] text-white hover:bg-[#16314D] transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-md bg-white border border-[#CBD5E1] text-[#1E3A5F] hover:bg-[#F1F5F9] transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 hover:shadow-sm transition">
              <div className="text-[#4A5D73] text-sm">Step 1</div>
              <h3 className="mt-2 text-xl font-medium text-[#1E3A5F]">Upload</h3>
              <p className="mt-2 text-gray-700 leading-relaxed">
                Add PDFs or DOCX files. Clean, dashed upload with clear formats and limits.
              </p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 hover:shadow-sm transition">
              <div className="text-[#4A5D73] text-sm">Step 2</div>
              <h3 className="mt-2 text-xl font-medium text-[#1E3A5F]">Generate</h3>
              <p className="mt-2 text-gray-700 leading-relaxed">
                Our AI extracts text and produces calm, well-structured multiple-choice questions.
              </p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 hover:shadow-sm transition">
              <div className="text-[#4A5D73] text-sm">Step 3</div>
              <h3 className="mt-2 text-xl font-medium text-[#1E3A5F]">Practice</h3>
              <p className="mt-2 text-gray-700 leading-relaxed">
                Study one focused question per screen with accessible progress indicators.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFC]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold text-[#1E3A5F]">
                  Ready to create your first quiz?
                </h2>
                <p className="mt-2 text-gray-700 leading-relaxed">
                  Upload a document after logging in. We’ll generate questions and store them securely.
                </p>
              </div>
              <div className="flex gap-4">
                <Link
                  href="/dashboard"
                  className="px-6 py-3 rounded-md bg-[#1E3A5F] text-white hover:bg-[#16314D] transition-colors"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-3 rounded-md bg-white border border-[#CBD5E1] text-[#1E3A5F] hover:bg-[#F1F5F9] transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">© {new Date().getFullYear()} Licen-sure</div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/login" className="text-[#1E3A5F] hover:text-[#16314D]">Login</Link>
            <Link href="/register" className="text-[#1E3A5F] hover:text-[#16314D]">Register</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
