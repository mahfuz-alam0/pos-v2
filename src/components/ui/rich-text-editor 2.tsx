"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import "./rich-text-editor.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    ["link"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      modules={MODULES}
      placeholder={placeholder}
    />
  );
}
