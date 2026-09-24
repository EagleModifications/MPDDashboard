import { useRef, useState } from "react"
import {
  CheckCircle2,
  ClipboardPaste,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react"

import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { Button } from "@/components/ui/button"

export default function RosterImport() {
  const fileInputRef =
    useRef<HTMLInputElement>(null)

  const [pasteData, setPasteData] =
    useState("")

  const [fileName, setFileName] =
    useState("")

  const [file, setFile] =
    useState<File | null>(null)

  const [isDragging, setIsDragging] =
    useState(false)

  const [isImporting, setIsImporting] =
    useState(false)

  const [imported, setImported] =
    useState(false)

  const [importMessage, setImportMessage] =
    useState("")

  const [importError, setImportError] =
    useState("")

  const hasData =
    pasteData.trim().length > 0 ||
    file !== null ||
    fileName.length > 0

  /* ─────────────────────────────────────────────
     Clear Import Status
  ───────────────────────────────────────────── */

  const clearStatus = () => {
    setImported(false)
    setImportMessage("")
    setImportError("")
  }

  /* ─────────────────────────────────────────────
     Handle File
  ───────────────────────────────────────────── */

  const handleFile = (
    selectedFile: File,
  ) => {
    const extension =
      selectedFile.name
        .split(".")
        .pop()
        ?.toLowerCase()

    const allowedExtensions = [
      "csv",
      "xlsx",
      "xls",
      "txt",
    ]

    if (
      !extension ||
      !allowedExtensions.includes(
        extension,
      )
    ) {
      setImportError(
        "Please upload a CSV, Excel (.xlsx/.xls), or TXT file.",
      )

      setImported(false)
      setImportMessage("")

      return
    }

    setFile(selectedFile)
    setFileName(
      selectedFile.name,
    )

    clearStatus()

    if (
      extension === "csv" ||
      extension === "txt"
    ) {
      const reader =
        new FileReader()

      reader.onload = (
        event,
      ) => {
        const result =
          event.target?.result

        if (
          typeof result ===
          "string"
        ) {
          setPasteData(result)
        }
      }

      reader.onerror = () => {
        setImportError(
          "The selected file could not be read.",
        )

        setImported(false)
        setImportMessage("")
      }

      reader.readAsText(
        selectedFile,
      )
    } else {
      /*
       * XLS/XLSX files are parsed
       * by the backend.
       */
      setPasteData("")
    }
  }

  /* ─────────────────────────────────────────────
     File Input
  ───────────────────────────────────────────── */

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile =
      event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    handleFile(selectedFile)
  }

  /* ─────────────────────────────────────────────
     Drag & Drop
  ───────────────────────────────────────────── */

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()

    setIsDragging(false)

    const droppedFile =
      event.dataTransfer.files?.[0]

    if (!droppedFile) {
      return
    }

    handleFile(droppedFile)
  }

  /* ─────────────────────────────────────────────
     Import
  ───────────────────────────────────────────── */

  const handleImport = async () => {
    if (
      !hasData ||
      isImporting
    ) {
      return
    }

    setIsImporting(true)

    clearStatus()

    try {
      let response: Response

      /*
       * File upload
       */

      if (file) {
        const formData =
          new FormData()

        formData.append(
          "file",
          file,
        )

        response =
          await fetch(
            "/api/import/roster",
            {
              method: "POST",
              body: formData,
            },
          )
      }

      /*
       * Pasted data
       */

      else {
        response =
          await fetch(
            "/api/import/roster",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                fileName:
                  fileName ||
                  "pasted-data.txt",

                data: pasteData,
              }),
            },
          )
      }

      /*
       * Read the response safely.
       */

      const responseText =
        await response.text()

      let result:
        | {
            success?: boolean
            message?: string
            error?: string
            added?: number
            updated?: number
            imported?: number
            totalMembers?: number
          }
        | null = null

      if (responseText.trim()) {
        try {
          result =
            JSON.parse(
              responseText,
            )
        } catch {
          result = null
        }
      }

      /*
       * Backend returned an error.
       */

      if (!response.ok) {
        throw new Error(
          result?.error ||
            responseText ||
            `The Roster import failed with status ${response.status}.`,
        )
      }

      /*
       * Import completed successfully.
       */

      setImported(true)

      setImportMessage(
        result?.message ||
          "Roster imported successfully.",
      )

      setPasteData("")
      setFileName("")
      setFile(null)

      if (fileInputRef.current) {
        fileInputRef.current.value =
          ""
      }
    } catch (error) {
      console.error(
        "Roster import error:",
        error,
      )

      setImported(false)

      if (
        error instanceof
        TypeError
      ) {
        setImportError(
          "Unable to connect to the MPD backend. Make sure server/index.ts is running on port 3001.",
        )
      } else if (
        error instanceof Error
      ) {
        setImportError(
          error.message,
        )
      } else {
        setImportError(
          "The Roster import failed.",
        )
      }
    } finally {
      setIsImporting(false)
    }
  }

  /* ─────────────────────────────────────────────
     Clear
  ───────────────────────────────────────────── */

  const handleClear = () => {
    setPasteData("")
    setFileName("")
    setFile(null)

    clearStatus()

    if (fileInputRef.current) {
      fileInputRef.current.value =
        ""
    }
  }

  /* ─────────────────────────────────────────────
     Clear Pasted Data
  ───────────────────────────────────────────── */

  const handleClearPaste = () => {
    setPasteData("")
    setFile(null)
    setFileName("")

    clearStatus()

    if (fileInputRef.current) {
      fileInputRef.current.value =
        ""
    }
  }

  /* ─────────────────────────────────────────────
     Clear Uploaded File
  ───────────────────────────────────────────── */

  const handleClearFile = () => {
    setFileName("")
    setFile(null)
    setPasteData("")

    clearStatus()

    if (fileInputRef.current) {
      fileInputRef.current.value =
        ""
    }
  }

  return (
    <DashboardLayout>
      <div
        className="
          min-w-0
          max-w-full
          space-y-6
          overflow-x-hidden
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {/* Header */}

        <div>
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-blue-500/20
                bg-blue-500/10
              "
            >
              <FileSpreadsheet className="h-5 w-5 text-blue-500" />
            </div>

            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">
                Roster Import
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Import the MPD roster from Google Sheets.
              </p>
            </div>
          </div>
        </div>

        {/* Expected Format */}

        <section
          className="
            rounded-xl
            border
            border-border
            bg-card
            p-5
            shadow-sm
          "
        >
          <div className="flex items-start gap-3">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-blue-500/10
              "
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-500" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold">
                Expected Format
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                The roster should contain the following columns
                copied directly from Google Sheets.
              </p>

              <pre
                className="
                  mt-3
                  max-w-full
                  overflow-x-auto
                  rounded-lg
                  border
                  border-border
                  bg-background
                  p-3
                  font-mono
                  text-xs
                  leading-5
                  text-muted-foreground
                  [scrollbar-width:none]
                  [&::-webkit-scrollbar]:hidden
                "
              >
{`Callsign    Badge    Name    Rank    Time in Dept    Time in Rank    Discord ID    Status
1N-01       0001     Andrew Z.    Chief Of Police    975 DAYS    91 DAYS    366688345625198603    Active`}
              </pre>
            </div>
          </div>
        </section>

        {/* Import Area */}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Paste Box */}

          <section
            className="
              rounded-xl
              border
              border-border
              bg-card
              p-6
              shadow-sm
            "
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="h-4 w-4 text-blue-500" />

                  <h2 className="text-lg font-semibold">
                    Paste Data
                  </h2>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  Copy the roster directly from Google Sheets and
                  paste it below.
                </p>
              </div>

              {pasteData && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={
                    handleClearPaste
                  }
                  className="h-8 shrink-0 rounded-md"
                  disabled={isImporting}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>

            <textarea
              value={pasteData}
              onChange={(event) => {
                setPasteData(
                  event.target.value,
                )

                setFile(null)
                setFileName("")

                clearStatus()

                if (
                  fileInputRef.current
                ) {
                  fileInputRef.current.value =
                    ""
                }
              }}
              placeholder={`Callsign\tBadge\tName\tRank\tTime in Dept\tTime in Rank\tDiscord ID\tStatus
1N-01\t0001\tAndrew Z.\tChief Of Police\t975 DAYS\t91 DAYS\t366688345625198603\tActive`}
              spellCheck={false}
              disabled={isImporting}
              className="
                mt-5
                block
                min-h-[300px]
                w-full
                resize-y
                overflow-y-auto
                overflow-x-hidden
                rounded-lg
                border
                border-border
                bg-background
                p-4
                font-mono
                text-xs
                leading-5
                outline-none
                transition-colors
                placeholder:font-mono
                placeholder:text-muted-foreground
                focus:border-blue-500/50
                focus:ring-2
                focus:ring-blue-500/10
                disabled:cursor-not-allowed
                disabled:opacity-60
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            />

            <p className="mt-2 text-xs text-muted-foreground">
              Google Sheets data should be pasted directly so the
              tab-separated columns are preserved.
            </p>
          </section>

          {/* Upload */}

          <section
            className="
              rounded-xl
              border
              border-border
              bg-card
              p-6
              shadow-sm
            "
          >
            <div>
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-500" />

                <h2 className="text-lg font-semibold">
                  Upload File
                </h2>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Upload a roster spreadsheet or data file.
              </p>
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => {
                setIsDragging(false)
              }}
              onDrop={handleDrop}
              className={`
                mt-5
                flex
                min-h-[300px]
                flex-col
                items-center
                justify-center
                rounded-lg
                border
                border-dashed
                px-6
                text-center
                transition-colors
                ${
                  isDragging
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-border bg-background"
                }
              `}
            >
              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-full
                  bg-muted
                "
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>

              <h3 className="mt-4 text-sm font-semibold">
                Drop your file here
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                or select a file from your computer
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-4 rounded-md"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={isImporting}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Choose File
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                className="hidden"
                onChange={handleFileChange}
              />

              <p className="mt-4 text-[11px] text-muted-foreground">
                CSV, XLSX, XLS, or TXT
              </p>
            </div>

            {fileName && (
              <div
                className="
                  mt-4
                  flex
                  items-center
                  justify-between
                  gap-3
                  rounded-lg
                  border
                  border-border
                  bg-muted/30
                  p-3
                "
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-md
                      bg-blue-500/10
                    "
                  >
                    <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {fileName}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Ready to import
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-md"
                  onClick={handleClearFile}
                  disabled={isImporting}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* Import Actions */}

        <section
          className="
            flex
            flex-col
            gap-4
            rounded-xl
            border
            border-border
            bg-card
            p-5
            shadow-sm
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <h2 className="text-sm font-semibold">
              Ready to Import
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Existing roster members will be updated and new
              Discord IDs will be added.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-md"
              onClick={handleClear}
              disabled={
                !hasData ||
                isImporting
              }
            >
              Clear
            </Button>

            <Button
              type="button"
              className="rounded-md"
              disabled={
                !hasData ||
                isImporting
              }
              onClick={handleImport}
            >
              {isImporting ? (
                <>
                  <span
                    className="
                      mr-2
                      h-4
                      w-4
                      animate-spin
                      rounded-full
                      border-2
                      border-current
                      border-t-transparent
                    "
                  />

                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Roster
                </>
              )}
            </Button>
          </div>
        </section>

        {/* Success */}

        {imported && (
          <div
            className="
              flex
              items-center
              gap-3
              rounded-xl
              border
              border-emerald-500/20
              bg-emerald-500/5
              p-4
            "
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />

            <div>
              <p className="text-sm font-medium">
                Import successful
              </p>

              <p className="text-xs text-muted-foreground">
                {importMessage}
              </p>
            </div>
          </div>
        )}

        {/* Error */}

        {importError && (
          <div
            className="
              rounded-xl
              border
              border-destructive/20
              bg-destructive/5
              p-4
            "
          >
            <p className="text-sm font-medium text-destructive">
              Import failed
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {importError}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}