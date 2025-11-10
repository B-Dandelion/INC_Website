export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 text-xs sm:text-sm text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>INC. All rights reserved.</span>
        <span>
          For questions and comments, send email to{" "}
          <a href="mailto:webmaster" className="underline text-gray-600">
            webmaster
          </a>
        </span>
      </div>
    </footer>
  );
}
