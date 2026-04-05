import React from "react";

export default function ExamplesLayout({ children }: { children: React.ReactNode }) {
	return <div className="mt-10 max-w-screen-lg xl:max-w-screen-xl mx-auto px-5">{children}</div>;
}

