"use client"

import { useState, useRef, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { uploadImportAction } from "@/app/actions/import"
import { Loader2, UploadCloud, FileText, X } from "lucide-react"

interface AccountOption {
  id: string
  name: string
  currency: string
}

export function NewImportForm({
  workspaceId,
  accounts,
}: {
  workspaceId: string
  accounts: AccountOption[]
}) {
  const [file, setFile] = useState<File | null>(null)
  const [accountId, setAccountId] = useState("")
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleClearFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file || !accountId) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("accountId", accountId)

    startTransition(async () => {
      await uploadImportAction(workspaceId, formData)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            Destination Account <span className="text-destructive">*</span>
          </label>
          <select
            name="accountId"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
            disabled={isPending}
            className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select Account</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            CSV Bank Statement <span className="text-destructive">*</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isPending}
            className="hidden"
            id="csv-file-upload"
          />

          {!file ? (
            <label
              htmlFor="csv-file-upload"
              className="flex items-center justify-center gap-2 h-11 px-4 border border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-xl cursor-pointer transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <UploadCloud className="w-4 h-4 text-primary" />
              <span>Choose CSV File</span>
            </label>
          ) : (
            <div className="flex items-center justify-between h-11 px-3.5 border border-primary/30 bg-primary/5 rounded-xl text-sm">
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate font-medium text-foreground">{file.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                  className="text-xs font-semibold text-primary hover:underline px-1.5 py-0.5"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleClearFile}
                  disabled={isPending}
                  className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={!file || !accountId || isPending}
          className="min-w-[160px] h-11 rounded-xl font-medium shadow-sm transition-all"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading &amp; Parsing...
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload &amp; Parse
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
