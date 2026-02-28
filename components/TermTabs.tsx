// components/TermTabs.tsx
"use client";

import { useState } from "react";
import { terms } from "@/lib/terms";

export default function TermTabs() {
  const [activeTab, setActiveTab] = useState("term1");

  const activeTerm = terms.find((t) => t.id === activeTab);

  return (
    <div className="w-full">
      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {terms.map((term) => (
          <button
            key={term.id}
            onClick={() => setActiveTab(term.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === term.id
                ? "bg-white border border-b-white border-gray-200 text-black -mb-px"
                : "text-gray-500 hover:text-black"
            }`}
          >
            {term.label}
          </button>
        ))}
      </div>

      {/* Course Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTerm?.courses.map((course) => (
          <div
            key={course.code}
            className="rounded-xl p-4 text-white shadow-md"
            style={{ backgroundColor: course.color }}
          >
            <p className="text-xs font-semibold uppercase opacity-80">{course.code}</p>
            <p className="text-lg font-bold mt-1">{course.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
