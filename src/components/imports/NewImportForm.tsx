"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, UploadCloud, FileText, X, CheckCircle2, Info, Clock } from "lucide-react"

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
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [accountId, setAccountId] = useState("")
  const [isReferenceOnly, setIsReferenceOnly] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [eta, setEta] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isUploading) {
      // Calculate realistic ETA based on file size (avg 40KB/sec processing time)
      const estimatedTotalSeconds = Math.max(2, Math.min(10, Math.ceil((file?.size || 20000) / 35000)));
      setEta(estimatedTotalSeconds);

      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const percent = Math.min(92, Math.round((elapsed / estimatedTotalSeconds) * 90));
        setProgress(percent);

        const remaining = Math.max(1, Math.ceil(estimatedTotalSeconds - elapsed));
        setEta(remaining);
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isUploading, file?.size]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleClearFile = () => {
    setFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file || !accountId) return

    setIsUploading(true)
    setProgress(5)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("workspaceId", workspaceId)
      formData.append("accountId", accountId)
      formData.append("file", file)
      formData.append("isReferenceOnly", isReferenceOnly ? "true" : "false")

      const res = await fetch("/api/imports/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse statement")
      }

      setProgress(100)
      setEta(0)

      setTimeout(() => {
        router.push(`/imports/${data.importId}`)
        router.refresh()
      }, 500)
    } catch (err: unknown) {
      setIsUploading(false)
      setProgress(0)
      setEta(null)
      setError(err instanceof Error ? err.message : "Failed to upload and parse statement")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs">
          {error}
        </div>
      )}

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
            disabled={isUploading}
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
            disabled={isUploading}
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
                  disabled={isUploading}
                  className="text-xs font-semibold text-primary hover:underline px-1.5 py-0.5"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleClearFile}
                  disabled={isUploading}
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

      {/* Reference Only Statement Checkbox */}
      <div className="p-3.5 bg-muted/30 border border-border/80 rounded-xl space-y-1">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isReferenceOnly}
            onChange={(e) => setIsReferenceOnly(e.target.checked)}
            disabled={isUploading}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
          />
          <div>
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              Import as Historical Reference Only
              <span className="text-[10px] bg-primary/10 text-primary font-normal px-1.5 py-0.2 rounded-full">
                Zero Balance Impact
              </span>
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Enable this if you are uploading past statements for your reference. These imported transactions will be saved for search &amp; history, but will <strong>NOT</strong> modify your current total balance or available money.
            </p>
          </div>
        </label>
      </div>

      {/* Upload Progress & Background Notification Card */}
      {isUploading && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2 text-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Parsing statement &amp; validating bank columns...</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground font-mono">
              <span>{progress}%</span>
              {eta !== null && eta > 0 && (
                <span className="flex items-center gap-1 text-primary text-[11px]">
                  <Clock className="w-3 h-3" /> ETA: ~{eta}s
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Reassurance Message */}
          <div className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-foreground">You can leave this page while we parse the file.</strong> Statement processing and reconciliation will safely continue in the background.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={!file || !accountId || isUploading}
          className="min-w-[170px] h-11 rounded-xl font-semibold shadow-sm transition-all"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Parsing ({progress}%)...
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
