"use client";

import { useDropzone } from "react-dropzone";
import { CloudArrowUpIcon, DownloadSimpleIcon, FileXlsIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/primitives/button";

export function WorkbookUploader({
  onFile,
  fileName
}: {
  onFile: (file: File) => void;
  fileName?: string;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"]
    },
    multiple: false,
    onDrop: (files) => {
      const f = files[0];
      if (f) onFile(f);
    }
  });

  return (
    <div
      {...getRootProps()}
      className={
        "rounded-card border-2 border-dashed p-8 text-center transition cursor-pointer " +
        (isDragActive ? "border-peacock bg-peacock-50/50" : "border-stone hover:border-peacock-300 bg-white")
      }
    >
      <input {...getInputProps()} />
      <div className="mx-auto h-12 w-12 rounded-card bg-porcelain2 flex items-center justify-center mb-3">
        {fileName ? (
          <FileXlsIcon size={24} weight="duotone" className="text-vert-600" />
        ) : (
          <CloudArrowUpIcon size={24} weight="duotone" className="text-peacock" />
        )}
      </div>
      <p className="text-section">
        {fileName ? `Loaded: ${fileName}` : "Drop your Excel or CSV file here"}
      </p>
      <p className="text-meta text-ink-500 mt-1">
        .xlsx, .xls, .csv · up to 10 MB. Validated locally before anything is sent.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={(e) => e.stopPropagation()}>
          <a
            href="/OpenSlot_AI_mock_database.xlsx"
            download
            className="inline-flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <DownloadSimpleIcon size={13} />
            Use sample workbook
          </a>
        </Button>
        <Button size="sm">Choose file</Button>
      </div>
    </div>
  );
}
